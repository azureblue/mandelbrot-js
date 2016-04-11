(function (rendering) {

    var Chunk = chunk.Chunk;
    var Setting = settings.Setting;

    function Mandelbrot(iters, bound, scale) {
        this.bound = bound;
        this.iters = iters;
        this.scale = scale;

        var iterate_point = function (x, y, bound, iters) {
            var r = x, i = y, k = 0, bound2 = bound * bound, val;

            for (; k < iters; ++k) {
                var tr = r * r - i * i + x;
                i = 2 * r * i + y;
                r = tr;
                val = r * r + i * i;
                if (val > bound2)
                    break;
            }

            return {
                iters: k,
                val: val
            };
        };

        var render_chunk = function (chunk_rect) {
            var rx = chunk_rect.x;
            var ry = chunk_rect.y;
            var width = chunk_rect.width;
            var height = chunk_rect.height;

            var data = new Uint8ClampedArray(width * height * 4);

            for (var i = 0; i < height; i++)
                for (var j = 0; j < width; j++) {
                    var escape = iterate_point((j + rx) / this.scale, (-i + ry) / this.scale, this.bound, this.iters);


                    if (isNaN(escape.iters))
                        escape.iters = this.iters;
                    // var log_zn = Math.log(escape.val) / 2;
                    // var mu = escape.iters === this.iters ? this.iters : escape.iters + 1 - Math.log(log_zn / Math.log(2)) / Math.log(2);

                    var color = Math.round(255.0 - (255.0 * escape.iters / this.iters)); //(1 + Math.sin(mu / this.iters * 100)) * 255 / 2;
                    var idx = (j + i * width) * 4;
                    data[idx + 0] = color; //Math.round(r * 255);
                    data[idx + 1] = color; //Math.round(g * 255);
                    data[idx + 2] = color; //Math.round(b * 255);
                    data[idx + 3] = 255;
                }

            return new Chunk(chunk_rect, data);
        };

        this.render_chunk = render_chunk;         
        
        this.list_settings = function () {
            return [
                new Setting('Escape bound', undefined, 'number', () => this.bound, x => {this.bound = x;},  Setting.map_to_float, 0.1),
                new Setting('Max iterations', undefined, 'number', () => this.iters, x => {this.iters = x;},  Setting.map_to_int, 10)
            ];
        };
        
        this.list_advanced_settings = function () {
            return [];
        };
    }

    rendering.Mandelbrot = Mandelbrot;

})(window.rendering = (window.rendering === undefined ? {} : window.rendering));
