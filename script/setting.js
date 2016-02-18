function Setting(name, description, type, get, set, mapping_function, step) {
    var name = name;
    var description = description;
    var type = type;
    var get = get;
    var set = set;
    var map = mapping_function !== undefined ? mapping_function : function(x) {return x;};
    var step = step;
    
    this.get_name = function() { return name;};
    this.get_description = function() { return description;};
    this.get_type = function() { return type;};
    this.get_step = function() { return step;};
    
    this.get_setting = function() {
        return get();
//	if (obj['get_' + name] !== undefined) return obj['get_' + name]();
//	if (obj[name] !== undefined) return obj[name];
//	console.log('Invalid setting: ' + name + ' for object: ' + obj);
    };
    
    this.set_setting = function(value) {
        set(map(value));
//	if (obj['set_' + name] !== undefined) {obj['set_' + name](map(value)); return;}
//	if (obj[name] !== undefined) {obj[name] = map(value); return;};
//	console.log('Invalid setting: ' + name + ' for object: ' + obj);
    };
}

Setting.map_to_float = function() {
    return function(x) {
	return parseFloat(x);
    };
};

Setting.map_to_int = function() {
    return function(x) {
	return parseInt(x);
    };
};
