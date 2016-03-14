geom = (function() {
    
    function Vec2(x, y) {
	this.x = x;
	this.y = y;
    };

    Vec2.prototype.vector_to = function(vec) {
	return new Vec2(vec.x - this.x, vec.y - this.y);
    };

    Vec2.prototype.same_position = function(vec) {
	return (this.x === vec.x) && (this.y === vec.y);
    };

    Vec2.prototype.move = function(point) {
	this.x += point.x;
	this.y += point.y;
	return this;
    };

    Vec2.prototype.inverse = function() {
	this.x *= -1;
	this.y *= -1;
	return this;
    };

    Vec2.from_event = function(event) {
	return new Vec2(event.offsetX, event.offsetY);
    };
    
    function Rect(x, y, width, height) {
	Vec2.call(this, x, y);
	this.width = width;
	this.height = height;
    }

    Rect.prototype = Object.create(Vec2.prototype);
    
    return {
	Vec2: Vec2,
	Rect: Rect
    };
    
})();
    
    
