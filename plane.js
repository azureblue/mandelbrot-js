
(function (plane) {
    var Vec2 = geom.Vec2;

    var Mandelbrot = rendering.Mandelbrot;
    var Chunk_Manager = chunk.Chunk_Manager;
    var Chunk_Rect = chunk.Chunk_Rect;

    var draw_canvas, stats_canvas, overlay_canvas, draw_context, stats_context, overlay_context;

    var width, height;

    var offset = new Vec2(-400, -300);

    var scalen = 33;

    var
            chunk_size = 200,
            preview_freq = 5,
            preview = undefined;

    var mouse_down_point, mouse_move_point;

    var chunk_queue = [];
    var renderer = new Mandelbrot(300, 2, Math.pow(1.2, scalen));
    var chunk_manager = new Chunk_Manager(renderer);

    var dragging = false, draw = false;
    var draw_async_timeout_handle;

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
        return new Preview(new Uint8ClampedArray(context2d.getImageData(0, 0, width, height).data), width, height);
    };

    function redraw() {
        stop_drawing();
        chunk_queue.length = 0;

        draw_stats();

        var xoffset = offset.x;
        var yoffset = offset.y;
        var mod_xalign = xoffset % chunk_size;
        var mod_yalign = yoffset % chunk_size;
            
        var xalign = mod_xalign >= 0 ? mod_xalign : chunk_size + mod_xalign;
        var yalign = mod_yalign >= 0 ? mod_yalign : chunk_size + mod_yalign;

        for (var i = -yalign; i < height; i = i + chunk_size)
            for (var j = -xalign; j < width; j = j + chunk_size)
                schedule_chunk(j, i, j + offset.x, -i + -offset.y, chunk_size, chunk_size);

        start_drawing();
    }

    function schedule_chunk(x, y, rx, ry, w, h) {
        chunk_queue.push(new Chunk_Rect(new Vec2(rx, ry), new Vec2(x, y), w, h));
    }

    function draw_next_chunk() {
        if (chunk_queue.length > 0 && draw) {
            var chunkRect = chunk_queue.pop();
            draw_chunk(chunkRect);

            if (chunk_queue.length % preview_freq === 0)
                preview = Preview.create_preview(draw_context, width, height);

            draw_async_timeout_handle = async(function () {
                draw_next_chunk();
            });

        } else {
            if (chunk_queue.length === 0)
                preview = Preview.create_preview(draw_context, width, height);

            draw = false;
        }
        draw_stats();
    }

    function stop_drawing() {
        draw = false;
        clearTimeout(draw_async_timeout_handle);
    }

    function start_drawing() {
        if (!draw) {
            clearTimeout(draw_async_timeout_handle);
            draw = true;
            draw_async_timeout_handle = async(function () {
                draw_next_chunk();
            });
        }
    }

    function draw_chunk(chunkRect) {
        var id = draw_context.createImageData(chunkRect.width, chunkRect.height);

        var chunk = chunk_manager.get_chunk(chunkRect);
        id.data.set(chunk.data);

        draw_context.putImageData(id, chunkRect.screen_position.x, chunkRect.screen_position.y);
    }

    function async(action) {
        return setTimeout(action, 0);
    }

    var cd_timeout = undefined;

    function countdown_continous_drawing() {
        stop_drawing();
        if (cd_timeout) {
            clearTimeout(cd_timeout);
        }
        cd_timeout = setTimeout(redraw, 400);
    }

    function handle_mouse_down(event) {
        if (event.button === 2)
            return;

        stop_drawing();        
        preview = Preview.create_preview(draw_context, width, height);
        mouse_down_point = Vec2.from_event(event);
        mouse_move_point = Vec2.from_event(event);

        dragging = true;
    }

    function handle_mouse_up(event) {
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
        var xo = event.originalEvent.offsetX + offset.x;
        var yo = event.originalEvent.offsetY + offset.y;
        preview = undefined;
        plane.set_scale_n(scalen + (((event.originalEvent.wheelDelta ? event.originalEvent.wheelDelta : -event.originalEvent.detail) > 0) ? 1 : -1), xo, yo);
    }

    plane.set_scale_n = function (nscale, xo, yo) {
        if (typeof xo === 'undefined')
            xo = offset.x + width / 2;
        if (typeof yo === 'undefined')
            yo = offset.y + height / 2;

        newscale = Math.pow(1.2, nscale);
        offset.x += Math.round(xo * newscale / renderer.scale - xo);
        offset.y += Math.round(yo * newscale / renderer.scale - yo);
        renderer.scale = newscale;
        scalen = nscale;
        chunk_manager.clear();
        redraw();
    };

    plane.init = function (main, top, overlay) {
        draw_canvas = document.getElementById(main);
        stats_canvas = document.getElementById(top);  
        overlay_canvas = document.getElementById(overlay);  
        
        draw_canvas.width = draw_canvas.clientWidth;
        draw_canvas.height = draw_canvas.clientHeight;
        stats_canvas.width = stats_canvas.clientWidth;
        stats_canvas.height = stats_canvas.clientHeight;
        overlay_canvas.width = overlay_canvas.clientWidth;
        overlay_canvas.height = overlay_canvas.clientHeight;
        
        width = draw_canvas.width;
        height = draw_canvas.height;
        offset.x = Math.round(-width / 2);
        offset.y = Math.round(-height / 2);
        
        draw_context = draw_canvas.getContext('2d');
        stats_context = stats_canvas.getContext('2d');        
        overlay_context = overlay_canvas.getContext('2d');

        stats_context.font = "14px monospace";

        $('#' + overlay).bind("mousewheel DOMMouseScroll", handle_mouse_wheel);
        $('#' + overlay).mousedown(handle_mouse_down);
        $('#' + overlay).mouseup(handle_mouse_up);
        $('#' + overlay).mousemove(handle_mouse_move);
        
        overlay_context.strokeStyle = "rgba(0, 0, 200, 0.3)";
        overlay_context.lineWidth=2;
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
        stats_context.fillText("MANDELBROT SET EXPLORER  |  ITERATIONS: " + renderer.iters +
                "  |  SCALE: " + renderer.scale.toPrecision(10) + "  |  X: " + (offset.x +
                width / 2) / renderer.scale + "  |  Y: " + (offset.y + height / 2) / renderer.scale,
                10, 14);

        if (chunk_queue.length > 0 && draw) {
            stats_context.fillStyle = "rgba(255, 255, 255, 0.7)";
            stats_context.fillText("RENDERING: " + chunk_queue.length + " chunks to process",
                    width - 300, 14);
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
            new Setting('scale', 'Scale (1.2<sup>n</sup>)', 'number', function () {
                return plane.get_scale_n();
            }, function (x) {
                plane.set_scale_n(x);
            }, Setting.map_to_int(), 1)
        ];
    };

    plane.async = async;
    plane.redraw = redraw;
    plane.start_drawing = start_drawing;

})(window.plane = {});
