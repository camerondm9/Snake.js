var config = {websocketUrl: "ws://localhost:8080/snake"};
var snake = {lastFrame: 0,
			guideOpacity: 0,
			guideShow: false,
			overlayOpacity: 1.5,
			overlay: "Connecting...",
			connected: false,
			style: null,
			direction: null,
			self: null,
			autoPath: 3,
			maxPath: 50,
			lastTouch: {x: 0, y: 0, direction: null, threshold: 0},
			focus: {x: 0, y: 0, vx: 0, vy: 0},
			syncExtra: {x: 3, y: 3, timeout: 5000, ticks: 50},
			chunks: [],
			actors: [],
			canvas: null,
			context: null,
			socket: null,
			speed: 100,
			timer: null};

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
		snake.socket = new WebSocket(config.websocketUrl, "snake2");
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
	snake.canvas.onmouseup = snake.mouseReset;
	snake.canvas.ontouchstart = snake.touchMotion;
	snake.canvas.ontouchmove = snake.touchMotion;
	snake.canvas.ontouchend = snake.touchReset;
	snake.canvas.ontouchcancel = snake.touchReset;
	snake.canvas.ontouchleave = snake.touchReset;
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

snake.mouseReset = function(event)
{
	if (event.button || event.which)
	{
		snake.touchReset(event);
	}
	else
	{
		event.preventDefault();
	}
}

snake.touchMotion = function(event)
{
	event.preventDefault();
	snake.guideShow = true;
	var rect = event.target.getBoundingClientRect();
	var centeredX = (snake.canvas.width / 2) + rect.left - (event.clientX || event.pageX || event.changedTouches[0].pageX);
	var centeredY = (snake.canvas.height / 2) + rect.top - (event.clientY || event.pageY || event.changedTouches[0].pageY);
	//var centerDistance = Math.sqrt((centeredX * centeredX) + (centeredY * centeredY));
	var angle = Math.atan2(centeredX, centeredY);
	var dir = (Math.floor((-angle * 2 / Math.PI) + 1.5) + 4) % 4;
	if (snake.lastTouch.direction == dir)
	{
		var dx = snake.lastTouch.x - centeredX;
		var dy = snake.lastTouch.y - centeredY;
		snake.lastTouch.x = centeredX;
		snake.lastTouch.y = centeredY;
		snake.lastTouch.threshold -= Math.sqrt((dx * dx) + (dy * dy));
		if (snake.lastTouch.threshold > 0)
		{
			return;
		}
	}
	else
	{
		snake.lastTouch.x = centeredX;
		snake.lastTouch.y = centeredY;
		snake.lastTouch.direction = dir;
	}
	snake.lastTouch.threshold = Math.min(snake.canvas.width, snake.canvas.height) / 4;
	snake.tryDirection(dir);
}

snake.touchReset = function(event)
{
	snake.lastTouch.direction = null;
	event.preventDefault();
}

snake.animate = function(timestamp)
{
	window.requestAnimationFrame(snake.animate);
	//Make canvas fill window...
	if ((snake.canvas.width != window.innerWidth) || (snake.canvas.height != window.innerHeight))
	{
		snake.canvas.width = window.innerWidth;
		snake.canvas.height = window.innerHeight;
		snake.context.font = "30px sans-serif";
	}
	//Follow snake smoothly...
	if (snake.self && snake.self.lastTime)
	{
		var elapsed = (timestamp - snake.lastFrame);
		var remaining = (timestamp - snake.self.lastTime);
		var rx = snake.focus.x - snake.self.x;
		var ry = snake.focus.y - snake.self.y;
		switch (snake.direction)
		{
		case 0:
			rx -= 1 - (remaining / snake.speed);
			break;
		case 1:
			ry -= 1 - (remaining / snake.speed);
			break;
		case 2:
			rx += 1 - (remaining / snake.speed);
			break;
		case 3:
			ry += 1 - (remaining / snake.speed);
			break;
		}
		snake.focus.vx = (snake.focus.vx * 3 - rx * 1000 / snake.speed) / 4;
		snake.focus.vy = (snake.focus.vy * 3 - ry * 1000 / snake.speed) / 4;
		snake.focus.x += snake.focus.vx * elapsed / 1000;
		snake.focus.y += snake.focus.vy * elapsed / 1000;
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
	snake.lastFrame = timestamp;
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
		var adjustX = snake.canvas.width / 2 - ((snake.focus.x + 0.5) * csize);
		var adjustY = snake.canvas.height / 2 - ((snake.focus.y + 0.5) * csize);
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
				if (!chunk.grid.length)
				{
					//Pulsing purple while loading...
					snake.context.fillStyle = "rgba(80,0,80," + ((Math.sin(Date.now() / 800) / 4) + 0.75) + ")";
					snake.context.fillRect(Math.round((offsetX * csize) + adjustX), Math.round((offsetY * csize) + adjustY), csize * snake.chunkSize, csize * snake.chunkSize);
				}
				else
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
	}
	//Show path...
	if (snake.self)
	{
		snake.context.fillStyle = snake.style;
		var project = {x: snake.self.x, y: snake.self.y};
		for (var i = 0; i < snake.self.path.length; i++)
		{
			switch (snake.self.path[i])
			{
			case 0:
				project.x -= 1;
				break;
			case 1:
				project.y -= 1;
				break;
			case 2:
				project.x += 1;
				break;
			case 3:
				project.y += 1;
				break;
			}
			snake.context.beginPath();
			snake.context.arc(Math.round(((project.x + 0.5) * csize) + adjustX), Math.round(((project.y + 0.5) * csize) + adjustY), (i == 0 || i == (snake.self.path.length - 1)) ? 3 : 2, 0, 2 * Math.PI, false);
			snake.context.fill();
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

snake.plot = function(x, y, style)
{
	for (var j = 0; j < snake.chunks.length; j++)
	{
		var chunk = snake.chunks[j];
		var offsetX = (chunk.x * snake.chunkSize);
		var offsetY = (chunk.y * snake.chunkSize);
		if ((offsetX <= x) &&
			((offsetX + snake.chunkSize) > x) && 
			(offsetY <= y) &&
			((offsetY + snake.chunkSize) > y))
		{
			if (chunk.grid.length)
			{
				chunk.grid[x - offsetX][y - offsetY] = style;
				return true;
			}
		}
	}
	return false;
}

snake.tryDirection = function(dir)
{
	if (!snake.self.path.length)
	{
		snake.self.path.push(dir);
	}
	else
	{
		if (dir == (snake.self.path[snake.self.path.length - 1] + 2) % 4)
		{
			if (snake.self.path.length > 1)
			{
				snake.self.path.pop();
			}
		}
		else if (snake.self.path.length < snake.maxPath)
		{
			snake.self.path.push(dir);
		}
	}
}

snake.tick = function()
{
	//Self...
	snake.direction = snake.self.path.shift();
	if (!snake.self.path.length && (snake.direction >= 0))
	{
		snake.self.path.push(snake.direction);
	}
	else if ((snake.self.path.length < snake.autoPath) && (snake.self.path.length > 0))
	{
		snake.self.path.push(snake.self.path[snake.self.path.length - 1]);
	}
	//Movement...
	switch (snake.direction)
	{
	case 0:
		snake.self.x -= 1;
		break;
	case 1:
		snake.self.y -= 1;
		break;
	case 2:
		snake.self.x += 1;
		break;
	case 3:
		snake.self.y += 1;
		break;
	}
	snake.plot(snake.self.x, snake.self.y, snake.style);
	snake.self.lastTime = performance.now();
	//Actors...
	for (var i = 0; i < snake.actors.length; i++)
	{
		if (snake.actors[i])
		{
			var actor = snake.actors[i];
			//Movement...
			switch (actor.path.shift())
			{
			case 0:
				actor.x -= 1;
				break;
			case 1:
				actor.y -= 1;
				break;
			case 2:
				actor.x += 1;
				break;
			case 3:
				actor.y += 1;
				break;
			default:
				snake.actors[i] = null;
				continue;
			}
			//Plot point...
			if (!snake.plot(actor.x, actor.y, actor.style))
			{
				snake.actors[i] = null;
			}
		}
	}
	//Only load chunks that we need...
	snake.syncChunks();
}

snake.syncChunks = function()
{
	//Same as rendering code...
	var csize = Math.floor(Math.min(snake.canvas.width, snake.canvas.height) / 64);
	var halfx = snake.canvas.width / (2 * csize);
	var halfy = snake.canvas.height / (2 * csize);
	var xmax = Math.ceil(snake.focus.x + halfx);
	var ymax = Math.ceil(snake.focus.y + halfy);
	var xmin = Math.floor(snake.focus.x - halfx);
	var ymin = Math.floor(snake.focus.y - halfy);
	//Convert to chunk coordinates...
	xmax = Math.ceil((xmax + snake.syncExtra.x) / snake.chunkSize);
	ymax = Math.ceil((ymax + snake.syncExtra.y) / snake.chunkSize);
	xmin = Math.floor((xmin - snake.syncExtra.x) / snake.chunkSize);
	ymin = Math.floor((ymin - snake.syncExtra.y) / snake.chunkSize);
	//Check which ones we have...
	var present = [];
	for (var i = (xmax - xmin); i >= 0; i--)
	{
		present[i] = [];
		for (var j = (ymax - ymin); j >= 0; j--)
		{
			present[i][j] = false;
		}
	}
	for (var i = 0; i < snake.chunks.length; i++)
	{
		var chunk = snake.chunks[i];
		if ((chunk.x >= xmin) &&
			(chunk.x <= xmax) &&
			(chunk.y >= ymin) &&
			(chunk.y <= ymax))
		{
			//Don't count chunks that are being unsubscribed... (they exist only temporarily)
			present[chunk.x - xmin][chunk.y - ymin] = ((chunk.timeout || 0) < snake.syncExtra.ticks);
			chunk.timeout = 0;
		}
		else
		{
			chunk.timeout += 1;
			if (chunk.timeout == snake.syncExtra.ticks)
			{
				//Unsubscribe...
				snake.socket.send(JSON.stringify({x: chunk.x, y: chunk.y, s: false}));
			}
		}
	}
	//Request missing chunks...
	for (var i = (xmax - xmin); i >= 0; i--)
	{
		for (var j = (ymax - ymin); j >= 0; j--)
		{
			if (!present[i][j])
			{
				//Subscribe...
				snake.socket.send(JSON.stringify({x: i + xmin, y: j + ymin, s: true}));
				//Create placeholder, to prevent repeat requests...
				snake.chunks.push({x: i + xmin, y: j + ymin, grid: []});
			}
		}
	}
}

snake.socketMessage = function(event)
{
	var data = JSON.parse(event.data)
	//Welcome, provide server information...
	if (data.hasOwnProperty("w"))
	{
		snake.overlay = data.w;
		snake.overlayOpacity = 1.5;	//Greater than 1: no visual effect, takes longer to fade away...
		snake.chunks = [];
		snake.chunkBits = data.b;
		snake.chunkSize = 1 << snake.chunkBits;
		snake.chunkMask = snake.chunkSize - 1;
		snake.speed = data.i;
		snake.syncExtra.ticks = snake.syncExtra.timeout / snake.speed;
		//Restart timer...
		if (snake.timer)
		{
			window.clearInterval(snake.timer);
		}
		snake.timer = window.setInterval(snake.tick, snake.speed);
	}
	//Actor update...
	else if (data.hasOwnProperty("a"))
	{
		if (data.a < 0)
		{
			//Self update...
			snake.self = {x: data.x, y: data.y, path: []};
			snake.style = data.s;
			snake.focus.x = data.x;
			snake.focus.y = data.y;
			snake.direction = null;
		}
		else
		{
			if (data.x)
			{
				var actor = snake.actors[data.a];
				if (!actor)
				{
					actor = {};
					snake.actors[data.a] = actor;
				}
				if (data.s)
				{
					actor.style = data.s;
				}
				actor.x = data.x;
				actor.y = data.y;
				actor.path = data.p;
			}
			else
			{
				snake.actors[data.a] = null;
			}
		}
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
				snake.chunks.push(chunk);
			}
			if (!chunk.grid.length)
			{
				for (var i = 0; i < snake.chunkSize; i++)
				{
					chunk.grid[i] = [];
					for (var j = 0; j < snake.chunkSize; j++)
					{
						chunk.grid[i][j] = null;
					}
				}
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
	if (snake.timer)
	{
		window.clearInterval(snake.timer);
	}
}
