(function (plane) {
    
    var Vec2 = geom.Vec2;
    var Rect = geom.Rect;
    var Setting = settings.Setting;
    
    var Mandelbrot = rendering.Mandelbrot;
    var Chunk_Manager = chunk.Chunk_Manager;

    var draw_canvas, stats_canvas, stats_bottom_canvas, overlay_canvas,
            draw_context, stats_context, stats_bottom_context, overlay_context;

    var width, height, offset = new Vec2();

    var chunk_size = 200, preview_freq = 20, scalen = 33, preview;

    var mouse_down_point, mouse_move_point;

    var chunk_queue = [], pre_rendering_chunk_queue = [] ;
    
    var renderer = new Mandelbrot(300, 2, Math.pow(1.2, scalen));
    var chunk_manager = new Chunk_Manager(renderer);

    var dragging = false, draw = false;
    
    var continous_drawing_timeout = 200;
    
    var outer_chunks_layers = 5;
    
    var draw_async_timeout_handle, continous_drawing_timeout_handle;

    function Preview(data, width, height) {
        Vec2.call(this, 0, 0);
        this.data = data;
        this.width = width;
        this.height = height;

        this.render_to_canvas = function (ctx, xo, yo) {
            xo = xo || 0;
            yo = yo || 0;
            var ndata = ctx.getImageData(0, 0, this.width, this.height);
            ndata.data.set(this.data);
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.putImageData(ndata, this.x + xo, this.y + yo);
        };
    }

    Preview.prototype = Object.create(Vec2.prototype);

    Preview.create_preview = function (context2d, width, height) {
        return new Preview(new Uint8ClampedArray(context2d.getImageData(0, 0,
                width, height).data), width, height);
    };
    
    function Chunk_Request(screen_position, width, height, draw) {
	Rect.call(this, screen_position.x, screen_position.y, width, height);
	this.plane_rect = new Rect(plane_x(screen_position.x), plane_y(screen_position.y), width, height);
        this.draw = draw;
    }

    Chunk_Request.prototype = Object.create(Rect.prototype);

    function plane_x(screen_x) {
        return screen_x + offset.x;
    }
    
    function plane_y(screen_y) {
        return -screen_y - offset.y;
    }
    
    function clean_chunk_queue() {
        chunk_queue.length = 0;
        pre_rendering_chunk_queue.length = 0;
    }

    function redraw() {
        stop_drawing();
        clean_chunk_queue();
        draw_stats();
        schedule_spirally();        
        start_drawing();
    }

    function schedule_spirally() {
        var xoffset = offset.x;
        var yoffset = offset.y;
        var mod_xalign = xoffset % chunk_size;
        var mod_yalign = yoffset % chunk_size;

        var xalign = mod_xalign >= 0 ? mod_xalign : chunk_size + mod_xalign;
        var yalign = mod_yalign >= 0 ? mod_yalign : chunk_size + mod_yalign;

        var width_in_chunks = Math.floor((xalign + width + chunk_size - 1) /
                chunk_size);
        var height_in_chunks = Math.floor((yalign + height + chunk_size - 1) /
                chunk_size);

        var start_x = Math.floor((Math.floor((width - 1) / 2) + xalign) /
                chunk_size);

        var start_y = Math.floor((Math.floor((height - 1) / 2) + yalign) /
                chunk_size);

        var current_pos = new Vec2(start_x, start_y);

        var chunks_left = width_in_chunks * height_in_chunks;

        var sch_inner_chunk = function () {
            if (current_pos.x >= 0 && current_pos.x < width_in_chunks &&
                    current_pos.y >= 0 && current_pos.y < height_in_chunks) {
                schedule_chunk(-xalign + current_pos.x * chunk_size, -yalign +
                        current_pos.y * chunk_size, chunk_size, chunk_size);
                chunks_left--;
            }
        };
        
        var sch_outer_chunk = function () {            
                schedule_chunk_for_pre_rendering(-xalign + current_pos.x * chunk_size, -yalign +
                    current_pos.y * chunk_size, chunk_size, chunk_size);            
        };

        var delta = 0;

        sch_inner_chunk();

        while (chunks_left > 0) {
            for (var i = (delta++, 0); i < delta; i++, current_pos.x += 1)
                sch_inner_chunk();

            for (var i = 0; i < delta; i++, current_pos.y += 1)
                sch_inner_chunk();

            for (var i = (delta++, 0), i = 0; i < delta; i++, current_pos.x -= 1)
                sch_inner_chunk();

            for (var i = 0; i < delta; i++, current_pos.y -= 1)
                sch_inner_chunk();
        }

        for (var l = 1; l <= outer_chunks_layers; l++) {
            current_pos = new Vec2(l * -1, l * -1);
            var delta_x = width_in_chunks + l * 2 - 1;
            var delta_y = height_in_chunks + l * 2 - 1;
            for (var i =  0; i < delta_x; i++, current_pos.x += 1)
                sch_outer_chunk();

            for (var i = 0; i < delta_y; i++, current_pos.y += 1)
                sch_outer_chunk();

            for (var i = 0; i < delta_x; i++, current_pos.x -= 1)
                sch_outer_chunk();

            for (var i = 0; i < delta_y; i++, current_pos.y -= 1)
                sch_outer_chunk();
        }
    }
    
    function check_chunk_alignment(x, y) {
        if (((x + offset.x) % chunk_size !== 0) || ((-y - offset.y) % chunk_size !== 0)) 
            console.warn("scheduling non-aligned chunk at: " + x + ":" + y + " - " + (x + offset.x) + ":" + (-y - offset.y));
    }

    function schedule_chunk(x, y, w, h) {
        check_chunk_alignment(x, y);        
        chunk_queue.push(new Chunk_Request(new Vec2(x, y), w, h, true));
    }
    
    function schedule_chunk_for_pre_rendering(x, y, w, h) {
       check_chunk_alignment(x, y);
       pre_rendering_chunk_queue.push(new Chunk_Request(new Vec2(x, y), w, h, false));
    }
    
    function next_chunk_request() {
        if (chunk_queue.length > 0) 
            return chunk_queue.shift();
        
        if (pre_rendering_chunk_queue.length > 0)
            return pre_rendering_chunk_queue.shift();
        
        return undefined;
    }

    function draw_next_chunk() {
        draw_stats();
        if (!draw) return;
                
        var chunk_request = next_chunk_request();
        
        if (chunk_request != null) {
            var chunk = chunk_manager.get_chunk(chunk_request.plane_rect);
            if (chunk_request.draw) {                
                draw_chunk(chunk, chunk_request);               
                if (chunk_queue.length % preview_freq === 0)
                    preview = Preview.create_preview(draw_context, width, height);
            } 
            
            draw_async_timeout_handle = async(() => draw_next_chunk()); 
        }
        else
            draw = false;
        
    }

    function stop_drawing() {
        draw = false;
        clearTimeout(draw_async_timeout_handle);
    }

    function start_drawing() {
        if (!draw) {
            clearTimeout(draw_async_timeout_handle);
            draw = true;
            draw_async_timeout_handle = async(() => draw_next_chunk());
        }
    }

    function draw_chunk(chunk, screen_position) {
        var id = draw_context.createImageData(chunk.chunk_rect.width, chunk.chunk_rect.height);
        id.data.set(chunk.data);
        draw_context.putImageData(id, screen_position.x, screen_position.y);
    }

    function async(action) {
        return setTimeout(action, 0);
    }

    function countdown_continous_drawing() {
        stop_drawing();
        if (continous_drawing_timeout_handle) {
            clearTimeout(continous_drawing_timeout_handle);
        }
        continous_drawing_timeout_handle = setTimeout(redraw, continous_drawing_timeout);
    }

    function handle_mouse_down(event) {
        if (event.button === 2) {
            event.preventDefault();
	    plane.pause();
	    settings.open_settings_dialog(plane.start_drawing);	
            return;
        }
            
        stop_drawing();
        preview = Preview.create_preview(draw_context, width, height);
        mouse_down_point = Vec2.from_event(event);
        mouse_move_point = Vec2.from_event(event);

        dragging = true;
    }

    function handle_mouse_drag_stop(event) {
        if (!dragging) 
            return;
        
        dragging = false;
        if (mouse_down_point.same_position(Vec2.from_event(event))) {
            offset.move(new Vec2(width / 2, height / 2).vector_to(mouse_down_point));
            redraw();
        }
    }

    function handle_mouse_move(event) {
        if (!dragging)
            return;

        countdown_continous_drawing();

        var temp_mouse_move_point = Vec2.from_event(event);
        var dxy = temp_mouse_move_point.vector_to(mouse_move_point);

        offset.move(dxy);

        if (preview) {
            preview.move(dxy.inverse());
            preview.render_to_canvas(draw_context, 0, 0);
        }

        mouse_move_point = temp_mouse_move_point;
    }

    function handle_mouse_wheel(event) {
        var xo = event.offsetX + offset.x;
        var yo = event.offsetY + offset.y;
        preview = undefined;
        plane.set_scale_n(scalen + (((event.wheelDelta ? event.wheelDelta : -event.detail) > 0) ? 2 : -2), xo, yo);
    }

    plane.set_scale_n = function (nscale, xo, yo) {
        xo = xo === undefined ? offset.x + width / 2 : xo;
        yo = yo === undefined ? offset.y + height / 2 : yo;
        
        newscale = Math.pow(1.2, nscale);
        offset.x += Math.round(xo * newscale / renderer.scale - xo);
        offset.y += Math.round(yo * newscale / renderer.scale - yo);
        renderer.scale = newscale;
        scalen = nscale;
        chunk_manager.clear();
        redraw();
    };

    plane.init = function (main, top, stats_bottom, overlay) {
        draw_canvas = document.getElementById(main);
        stats_canvas = document.getElementById(top);
        stats_bottom_canvas = document.getElementById(stats_bottom);
        overlay_canvas = document.getElementById(overlay);

        draw_canvas.width = draw_canvas.clientWidth;
        draw_canvas.height = draw_canvas.clientHeight;
        stats_canvas.width = stats_canvas.clientWidth;
        stats_canvas.height = stats_canvas.clientHeight;
        stats_bottom_canvas.width = stats_bottom_canvas.clientWidth;
        stats_bottom_canvas.height = stats_bottom_canvas.clientHeight;
        overlay_canvas.width = overlay_canvas.clientWidth;
        overlay_canvas.height = overlay_canvas.clientHeight;

        width = draw_canvas.width;
        height = draw_canvas.height;

        offset.x = Math.round(-width / 2);
        offset.y = Math.round(-height / 2);

        draw_context = draw_canvas.getContext('2d');
        stats_context = stats_canvas.getContext('2d');
        stats_bottom_context = stats_bottom_canvas.getContext('2d');
        overlay_context = overlay_canvas.getContext('2d');

        stats_context.font = "14px monospace";
        stats_bottom_context.font = "14px monospace";

        overlay_canvas.addEventListener("mousemove", handle_mouse_move);
        overlay_canvas.addEventListener("mousedown", handle_mouse_down);
        overlay_canvas.addEventListener("mouseup", handle_mouse_drag_stop);
        overlay_canvas.addEventListener("mouseout", handle_mouse_drag_stop);
        overlay_canvas.addEventListener("mousewheel", handle_mouse_wheel);
        overlay_canvas.addEventListener("DOMMouseScroll", handle_mouse_wheel);

        overlay_context.strokeStyle = "rgba(0, 0, 200, 0.3)";
        overlay_context.lineWidth = 2;
        
        overlay_context.beginPath();
        overlay_context.moveTo(width / 2, 20);
        overlay_context.lineTo(width / 2, height);
        overlay_context.stroke();

        overlay_context.beginPath();
        overlay_context.moveTo(0, height / 2);
        overlay_context.lineTo(width, height / 2);
        overlay_context.stroke();

        redraw();
    };

    function draw_stats() {

        stats_context.fillStyle = "rgb(122, 122, 122)";
        stats_context.fillRect(0, 0, 2000, 800);
        stats_context.fillStyle = "rgba(255, 255, 255, 0.7)";
        stats_context.fillText(
                "MANDELBROT SET EXPLORER  |  ITERATIONS: "
                + renderer.iters + " | SCALE: " + renderer.scale.toPrecision(10) + " | X: "
                + (offset.x + width / 2) / renderer.scale + "  |  Y: "
                + (offset.y + height / 2) / renderer.scale,
                10, 14);


        stats_bottom_context.clearRect(0, 0, 800, 25);
        if (!draw)
            return ;
        
        if (chunk_queue.length + pre_rendering_chunk_queue.length > 0 ) {
            var text = chunk_queue.length > 0 
            ? "RENDERING: " + chunk_queue.length + " chunks to process"
            : "PRE-RENDERING";
            var metrics = stats_bottom_context.measureText(text);
            var text_width = metrics.width;
            stats_bottom_context.fillStyle = "rgb(122, 122, 122)";
            stats_bottom_context.fillRect(0, 0, text_width + 20, 25);
            stats_bottom_context.fillStyle = "rgba(255, 255, 255, 0.7)";
            stats_bottom_context.fillText(text, 10, 14);
        }
    }

    plane.get_scale_n = function () {
        return scalen;
    };

    plane.pause = function () {
        stop_drawing();
    };

    plane.unpause = function () {
        start_drawing();
    };

    plane.get_preview_freq = function () {
        return preview_freq;
    };

    plane.set_preview_freq = function (freq) {
        preview_freq = freq;
    };

    plane.list_renderers = function () {
        return [renderer];
    };

    plane.list_settings = function () {
        return [
            new Setting('Scale (1.2<sup>n</sup>)', undefined, 'number', plane.get_scale_n, plane.set_scale_n, Setting.map_to_int, 1)
        ];
    };
    
    plane.list_advanced_settings = function () {
        return [            
            new Setting('Chunk size', undefined, 'number', () => chunk_size, 
                x => {
                    chunk_size = x;
                    chunk_manager.clear(); 
                    redraw();
                },  Setting.map_to_int, 10, 50),
            new Setting('Chunk cache size', undefined, 'number', () => chunk_manager.max_size, 
                x => chunk_manager.max_size = x,  Setting.map_to_int, 10, 50),
            new Setting('Draw while dragging timeout', undefined, 'number', () => continous_drawing_timeout, 
                x => {continous_drawing_timeout = x;},  Setting.map_to_int, 10, 10),
            new Setting('Preview frequency', undefined,  'number', () => preview_freq, 
                x => {preview_frequecy = x;},  Setting.map_to_int, 10, 10),
        ];
    };

    plane.async = async;
    plane.redraw = redraw;
    plane.start_drawing = start_drawing;

})(window.plane = {});
