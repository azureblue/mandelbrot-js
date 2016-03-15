function Setting(name, description, type, get_function, set_function, map_function, step) {
    var name = name;
    var desc = description;
    var type = type;
    var get = get_function;
    var set = set_function;
    var map = map_function !== undefined ? map_function : x => x;
    var step = step;
    
    this.get_name = () => name;
    this.get_desc = () => desc;
    this.get_type = () => type;
    this.get_step = () => step;    
    this.get_setting = () => get();    
    this.set_setting = (value) => set(map(value));
}

Setting.map_to_float = (x) => parseFloat(x);
Setting.map_to_int = (x) => parseInt(x);
