var snake = {guideOpacity: 0, guideShow: false, overlayOpacity: 1.5, overlay: "Connecting...", connected: false, style: null, direction: null, position: {x: 0, y: 0, lx: 0, ly: 0, lt: null}, focus: {x: 0, y: 0, changed: true}, chunks: [], canvas: null, context: null, rpc: {}, socket: null, timer: null};
snake.websocketUrl = "ws://" + window.location.host + "/snake";

snake.init = function()
{
	//Get canvas...
	snake.canvas = document.getElementById("cvsSnake");
	if (snake.canvas.getContext)
	{
		snake.context = snake.canvas.getContext("2d");
		snake.context.fillStyle = "rgb(0,0,0)";
		snake.context.fillRect(0, 0, snake.canvas.width, snake.canvas.height);
		snake.context.font = "30px sans-serif";
	}
	else
	{
		document.getElementById("msgError").innerHTML = "Your browser must support HTML5 canvas!";
		return;
	}
	//Connect to server...
	if (WebSocket)
	{
		snake.socket = new WebSocket(snake.websocketUrl, "snake2");
		snake.socket.onopen = snake.socketOpen;
		snake.socket.onmessage = snake.socketMessage;
		snake.socket.onclose = snake.socketClose;
	}
	else
	{
		document.getElementById("msgError").innerHTML = "Your browser must support HTML5 websocket!";
		return;
	}
	//Attach events...
	document.onkeydown = snake.keydown;
	snake.canvas.onmousedown = snake.mouseMotion;
	snake.canvas.onmousemove = snake.mouseMotion;
	snake.canvas.onmouseup = snake.touchDefault;
	snake.canvas.ontouchstart = snake.touchMotion;
	snake.canvas.ontouchend = snake.touchDefault;
	snake.canvas.ontouchcancel = snake.touchDefault;
	snake.canvas.ontouchleave = snake.touchDefault;
	snake.canvas.ontouchmove = snake.touchMotion;
	//Begin animation...
	window.requestAnimationFrame(snake.animate);
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

snake.tick = function()
{
	
}

snake.animate = function(timestamp)
{
	window.requestAnimationFrame(snake.animate);
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
	if ((snake.canvas.width != window.innerWidth) || (snake.canvas.height != window.innerHeight))
	{
		snake.canvas.width = window.innerWidth;
		snake.canvas.height = window.innerHeight;
		snake.context.font = "30px sans-serif";
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
	snake.overlayOpacity = Math.max(snake.overlayOpacity - 0.005, 0);
	//Refresh screen...
	snake.render();
}

snake.render = function()
{
	//Clear background...
	snake.context.fillStyle = "rgb(0,0,0)";
	snake.context.fillRect(0, 0, snake.canvas.width, snake.canvas.height);
	if (snake.chunks.length)
	{
		//Track focus position smoothly...
		var csize = Math.floor(Math.min(snake.canvas.width, snake.canvas.height) / 64);
		var halfx = snake.canvas.width / (2 * csize);
		var halfy = snake.canvas.height / (2 * csize);
		var xmax = Math.ceil(snake.focus.x + halfx);
		var ymax = Math.ceil(snake.focus.y + halfy);
		var xmin = Math.floor(snake.focus.x - halfx);
		var ymin = Math.floor(snake.focus.y - halfy);
		var adjustX = snake.canvas.width / 2 - snake.focus.x;
		var adjustY = snake.canvas.height / 2 - snake.focus.y;
		//Fill cells...
		for (var i = 0; i < snake.chunks.length; i++)
		{
			var chunk = snake.chunks[i];
			var offsetX = (chunk.x * snake.chunkSize);
			var offsetY = (chunk.y * snake.chunkSize);
			if ((offsetX <= xmax) &&
				((offsetX + snake.chunkSize) >= xmin) && 
				(offsetY <= ymax) &&
				((offsetY + snake.chunkSize) >= ymin))
			{
				var localXmax = Math.min(snake.chunkSize, xmax - offsetX);
				var localYmax = Math.min(snake.chunkSize, ymax - offsetY);
				for (var x = Math.max(0, xmin - offsetX); x <= localXmax; x++)
				{
					if (chunk.grid[x])
					{
						for (var y = Math.max(0, ymin - offsetY); y <= localYmax; y++)
						{
							if (chunk.grid[x][y])
							{
								snake.context.fillStyle = chunk.grid[x][y];
								snake.context.fillRect(Math.round(((x + offsetX) * csize) + adjustX), Math.round(((y + offsetY) * csize) + adjustY), csize, csize);
							}
						}
					}
				}
			}
		}
	}
	//Show mouse/touch guidelines...
	if (snake.guideOpacity > 0)
	{
		snake.context.strokeStyle = "rgba(255,255,255," + snake.guideOpacity + ")";
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
	//Show overlay text...
	if ((snake.overlayOpacity > 0) && snake.overlay)
	{
		snake.context.fillStyle = "rgba(255,255,255," + snake.overlayOpacity + ")";
		var size = snake.context.measureText(snake.overlay);
		snake.context.fillText(snake.overlay, (snake.canvas.width - size.width) / 2, (snake.canvas.height - 30) / 2);
	}
}

snake.socketMessage = function(event)
{
	var data = JSON.parse(event.data)
	//Generic RPC...
	if (data.hasOwnProperty("r"))
	{
		if (snake.rpc.hasOwnProperty(data.r))
		{
			snake.rpc[data.r].apply(window, data.a);
		}
		else
		{
			console.log("RPC '" + data.r + "' not found!");
		}
	}
	//Welcome, provide server information...
	if (data.hasOwnProperty("w"))
	{
		snake.overlay = data.w;
		snake.overlayOpacity = 1.5;	//Greater than 1: no visual effect, takes longer to fade away...
		snake.chunks = [];
		snake.chunkBits = data.b;
		snake.chunkSize = 1 << snake.chunkBits;
		snake.chunkMask = snake.chunkSize - 1;
	}
	//Chunk update...
	else if (data.hasOwnProperty("x"))
	{
		if (data.hasOwnProperty("g"))
		{
			//Find chunk...
			var chunk = null;
			for (var i = 0; i < snake.chunks.length; i++)
			{
				if ((snake.chunks[i].x == data.x) && (snake.chunks[i].y == data.y))
				{
					chunk = snake.chunks[i];
					break;
				}
			}
			//Create/replace chunk...
			if (!chunk)
			{
				chunk = {x: data.x, y: data.y, grid: []};
				snake.chunks.push(chunk);
			}
			var styles = data.s;
			for (var i = 0; i < snake.chunkSize; i++)
			{
				chunk.grid[i] = [];
				for (var j = 0; j < snake.chunkSize; j++)
				{
					chunk.grid[i][j] = styles[data.g[i][j]];
				}
			}
		}
		else if (data.hasOwnProperty("u"))
		{
			//Find chunk...
			var chunk = null;
			for (var i = 0; i < snake.chunks.length; i++)
			{
				if ((snake.chunks[i].x == data.x) && (snake.chunks[i].y == data.y))
				{
					chunk = snake.chunks[i];
					break;
				}
			}
			//Update chunk...
			if (!chunk)
			{
				chunk = {x: data.x, y: data.y, grid: []};
				for (var i = 0; i < snake.chunkSize; i++)
				{
					chunk.grid[i] = [];
					for (var j = 0; j < snake.chunkSize; j++)
					{
						chunk.grid[i][j] = null;
					}
				}
				snake.chunks.push(chunk);
			}
			var styles = data.s;
			var values = data.u;
			for (var i = 0; i < values.length; i++)
			{
				var x = values[i] & snake.chunkMask;
				var y = values[i] & (snake.chunkMask << snake.chunkBits);
				var s = values[i] & (-1 << (2 * snake.chunkBits));
				chunk.grid[x][y] = styles[s];
			}
		}
		else
		{
			//Delete chunk...
			var chunk = null;
			for (var i = 0; i < snake.chunks.length; i++)
			{
				if ((snake.chunks[i].x == data.x) && (snake.chunks[i].y == data.y))
				{
					snake.chunks.splice(i, 1);
					break;
				}
			}
		}
	}
	//Assign style...
	else if (data.hasOwnProperty("s"))
	{
		snake.style = data.s;
	}
	else
	{
		//Unknown message type...
	}
}

snake.socketOpen = function(event)
{
	snake.connected = true;
}

snake.socketClose = function(event)
{
	snake.chunks = [];
	snake.overlay = snake.connected ? "Connection lost!" : "Failed to connect!";
	snake.overlayOpacity = 1.5;
	snake.connected = false;
}
