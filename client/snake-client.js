var snake = {guideOpacity: 0, guideShow: true, direction: null, position: {x: 0, y: 0, lx: 0, ly: 0, lt: null}, focus: {x: 0, y: 0, changed: true}, grid: [], canvas: null, context: null, socket: null, timer: null};

snake.init = function()
{
	//Get canvas...
	snake.canvas = document.getElementById("cvsSnake");
	if (snake.canvas.getContext)
	{
		snake.context = snake.canvas.getContext("2d");
		snake.context.fillStyle = "rgb(0,0,0)";
		snake.context.fillRect(0, 0, snake.canvas.width, snake.canvas.height);
	}
	else
	{
		document.getElementById("msgError").innerHTML = "Your browser must support HTML5 canvas!";
		return;
	}
	document.onkeydown = snake.keydown;
	snake.canvas.onmousedown = snake.mouseMotion;
	snake.canvas.onmousemove = snake.mouseMotion;
	snake.canvas.onmouseup = snake.touchDefault;
	snake.canvas.ontouchstart = snake.touchMotion;
	snake.canvas.ontouchend = snake.touchDefault;
	snake.canvas.ontouchcancel = snake.touchDefault;
	snake.canvas.ontouchleave = snake.touchDefault;
	snake.canvas.ontouchmove = snake.touchMotion;
	snake.clearGrid(64);
	//Connect to server...
	if (WebSocket)
	{
		snake.socket = new WebSocket("ws://" + window.location.host + "/snake_socket", "snake_upd");
		snake.socket.onmessage = snake.socketMessage;
		snake.socket.onclose = snake.socketClose;
	}
	else
	{
		document.getElementById("msgError").innerHTML = "Your browser must support HTML5 websocket!";
		return;
	}
	window.requestAnimationFrame(snake.tick);
}
snake.clearGrid = function(s)
{
	snake.grid = [];
	for (var x = 0; x < s; x++)
	{
		snake.grid[x] = [];
		for (var y = 0; y < s; y++)
		{
			snake.grid[x][y] = "";
		}
	}
	snake.position.x = Math.round(s / 2);
	snake.position.y = Math.round(s / 2);
}

snake.keydown = function(event)
{
	switch (event.which || event.keyCode)
	{
		case 37:	//Left
			snake.tryDirection(0);
			event.preventDefault();
			snake.guideShow = false;
			break;
		case 38:	//Up
			snake.tryDirection(1);
			event.preventDefault();
			snake.guideShow = false;
			break;
		case 39:	//Right
			snake.tryDirection(2);
			event.preventDefault();
			snake.guideShow = false;
			break;
		case 40:	//Down
			snake.tryDirection(3);
			event.preventDefault();
			snake.guideShow = false;
			break;
		default:
			break;
	}
}
snake.mouseMotion = function(event)
{
	if (event.button || event.which)
	{
		snake.touchMotion(event);
	}
	else
	{
		event.preventDefault();
	}
}
snake.touchMotion = function(event)
{
	var rect = event.target.getBoundingClientRect();
	var localX = (event.clientX || event.pageX || event.changedTouches[0].pageX) - rect.left;
	var localY = (event.clientY || event.pageY || event.changedTouches[0].pageY) - rect.top;
	var angle = Math.atan2(256 - localX, 256 - localY);
	var dir = (Math.floor((-angle * 2 / Math.PI) + 1.5) + 4) % 4;
	snake.tryDirection(dir);
	snake.touchState = null;
	event.preventDefault();
	snake.guideShow = true;
}
snake.touchDefault = function(event)
{
	event.preventDefault();
}
snake.tryDirection = function(dir)
{
	if (snake.direction != dir)
	{
		if (snake.direction != (dir + 2) % 4)
		{
			snake.socket.send(JSON.stringify({"dir": dir}));
		}
	}
}
snake.tick = function(timestamp)
{
	window.requestAnimationFrame(snake.tick);
	//Track focus position...
	if (snake.focus.changed || !snake.position.lt)
	{
		snake.focus.changed = false;
		snake.position.lx = snake.position.x;
		snake.position.ly = snake.position.y;
		snake.position.lt = timestamp;
	}
	var dx = snake.focus.x - snake.position.lx;
	var dy = snake.focus.y - snake.position.ly;
	var rt = (timestamp - snake.position.lt) / 250;
	if (Math.abs(dx) > 2)
	{
		snake.position.x = snake.focus.x;
	}
	else
	{
		snake.position.x = snake.position.lx + (dx * rt);
	}
	if (Math.abs(dy) > 2)
	{
		snake.position.y = snake.focus.y;
	}
	else
	{
		snake.position.y = snake.position.ly + (dy * rt);
	}
	//Make canvas fill window...
	if (snake.canvas.width != window.innerWidth)
	{
		snake.canvas.width = window.innerWidth;
	}
	if (snake.canvas.height != window.innerHeight)
	{
		snake.canvas.height = window.innerHeight;
	}
	//Fade guide...
	if (snake.guideShow)
	{
		snake.guideOpacity = Math.min(snake.guideOpacity + 0.002, 0.1);
	}
	else
	{
		snake.guideOpacity = Math.max(snake.guideOpacity - 0.002, 0);
	}
	//Refresh screen...
	snake.render();
}
snake.render = function()
{
	//Clear background...
	snake.context.fillStyle = "rgb(0,0,0)";
	snake.context.fillRect(0, 0, snake.canvas.width, snake.canvas.height);
	//Fill cells...
	var csize = snake.canvas.width / 64;
	for (var x = 0; x <= 64; x++)
	{
		//Track focus position smoothly...
		var realX = Math.floor(snake.position.x) + x - 32;
		var adjustX = snake.position.x - Math.floor(snake.position.x);
		if (snake.grid[realX])
		{
			for (var y = 0; y <= 64; y++)
			{
				var realY = Math.floor(snake.position.y) + y - 32;
				var adjustY = snake.position.y - Math.floor(snake.position.y);
				if (snake.grid[realX][realY])
				{
					snake.context.fillStyle = snake.grid[realX][realY];
					snake.context.fillRect(Math.round((x - adjustX) * csize), Math.round((y - adjustY) * csize), csize, csize);
				}
			}
		}
	}
	//Show mouse/touch guidelines...
	if (snake.guideOpacity > 0)
	{
		snake.context.strokeStyle = "rgba(255, 255, 255, " + snake.guideOpacity + ")";
		snake.context.beginPath();
		var sizeMin = Math.min(snake.canvas.width, snake.canvas.height);
		var x = (snake.canvas.width - sizeMin) / 2;
		var y = (snake.canvas.height - sizeMin) / 2;
		snake.context.moveTo(x, y);
		snake.context.lineTo(x + sizeMin, y + sizeMin);
		snake.context.moveTo(x + sizeMin, y);
		snake.context.lineTo(x, y + sizeMin);
		snake.context.stroke();
	}
}

snake.socketMessage = function(event)
{
	var data = JSON.parse(event.data)
	if (data.hasOwnProperty("s"))
	{
		//Grid size...
		snake.clearGrid(data["s"]);
	}
	else if (data.hasOwnProperty("c"))
	{
		//Grid update...
		snake.grid[data["x"]][data["y"]] = data["c"];
	}
	else if (data.hasOwnProperty("d"))
	{
		//Movement update...
		snake.direction = data["d"];
		snake.focus.x = Math.min(Math.max(data["x"], 32), snake.grid.length - 32);
		snake.focus.y = Math.min(Math.max(data["y"], 32), snake.grid.length - 32);
		snake.focus.changed = true;
	}
	else
	{
		//Unknown message type...
	}
}
snake.socketClose = function(event)
{
	snake.clearGrid(64);
}