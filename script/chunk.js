var chunk = (function () {

    var Rect = geom.Rect;

    function Chunk_Manager(renderer) {
        var chunk_cache = new Map();
        
	this.renderer = renderer;
        this.max_size = 500;
        this.clean_size = 40;
        
	this.get_chunk = function (chunk_rect) {
            var key = "" + chunk_rect.x + ":" + chunk_rect.y;
            if (chunk_cache.has(key)) 
                return chunk_cache.get(key);

	    var new_chunk = this.renderer.render_chunk(chunk_rect);
            chunk_cache.set(key, new_chunk);
            if (chunk_cache.size > this.max_size)
                for (var i = 0; i < this.clean_size; i++) {
                    var it = chunk_cache.keys();
                    chunk_cache.delete(it.next().value);                    
                }
            
	    return new_chunk;
	};

	this.clear = () => chunk_cache.clear();
    }

    function Chunk(chunk_rect, data) {
	this.chunk_rect = chunk_rect;
	this.data = data;
    }

    return {
	Chunk_Manager: Chunk_Manager,
	Chunk: Chunk
    };

}());
