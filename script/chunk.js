var chunk = (function () {

    var Rect = geom.Rect;
    var Vec2 = geom.Vec2;

    function Chunk_Manager(renderer) {
	this.renderer = renderer;
        this.max_size = 300;
        this.clean_size = 40;
	this.chunk_cache = new Map();

	this.get_chunk = function (chunkRect) {
            var key = "" + chunkRect.x + ":" + chunkRect.y;
            if (this.chunk_cache.has(key)) 
                return this.chunk_cache.get(key);

	    var new_chunk = this.renderer.render_chunk(chunkRect);
            this.chunk_cache.set(key, new_chunk);
            if (this.chunk_cache.size > this.max_size)
                for (var i = 0; i < this.clean_size; i++) {
                    var it = this.chunk_cache.keys();
                    this.chunk_cache.delete(it.next().value);                    
                }
            
	    return new_chunk;
	};

	this.clear = function () {
            this.chunk_cache.clear();
	};
    }

    function Chunk_Rect(real_position, screen_position, width, height) {
	Rect.call(this, real_position.x, real_position.y, width, height);
	this.screen_position = screen_position;
    }

    Chunk_Rect.prototype = Object.create(Rect);

    function Chunk(rect, data) {
	Rect.call(this, rect.x, rect.y, rect.width, rect.height);
	this.data = data;
    }

    Chunk.prototype = Object.create(Rect.prototype);

    return {
	Chunk_Manager: Chunk_Manager,
	Chunk_Rect: Chunk_Rect,
	Chunk: Chunk
    };

}());
