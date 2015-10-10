var snake = {guideOpacity: 0,
			guideShow: false,
			overlayOpacity: 1.5,
			overlay: "Connecting...",
			connected: false,
			style: null,
			direction: null,
			self: null,
			focus: {x: 0, y: 0},
			syncExtra: {x: 20, y: 20, timeout: 5000, ticks: 5},
			chunks: [],
			actors: [],
			canvas: null,
			context: null,
			socket: null,
			speed: 100,
			timer: null};
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
		snake.socket = {send: function(a) {console.log(a)}};
		
		//snake.socket = new WebSocket(snake.websocketUrl, "snake2");
		//snake.socket.onopen = snake.socketOpen;
		//snake.socket.onmessage = snake.socketMessage;
		//snake.socket.onclose = snake.socketClose;
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
	snake.canvas.onmouseup = snake.preventDefault;
	snake.canvas.ontouchstart = snake.touchMotion;
	snake.canvas.ontouchmove = snake.touchMotion;
	snake.canvas.ontouchend = snake.preventDefault;
	snake.canvas.ontouchcancel = snake.preventDefault;
	snake.canvas.ontouchleave = snake.preventDefault;
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
	event.preventDefault();
	snake.guideShow = true;
}

snake.preventDefault = function(event)
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
			((offsetX + snake.chunkSize) >= x) && 
			(offsetY <= y) &&
			((offsetY + snake.chunkSize) >= y))
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

snake.tick = function()
{
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
		if (data.s)
		{
			var actor = snake.actors[data.a];
			if (!actor)
			{
				actor = {};
				snake.actors[data.a] = actor;
			}
			actor.style = data.s;
			actor.x = data.x;
			actor.y = data.y;
			actor.path = data.p;
		}
		else
		{
			snake.actors[data.a] = null;
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
	if (snake.timer)
	{
		window.clearInterval(snake.timer);
	}
}
