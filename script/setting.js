var settings = (function (settings) {
    function Setting(name, description, type, get_function, set_function, map_function, step, min, max) {
        var map_function = map_function !== undefined ? map_function : x => x;

        this.get_name = () => name;
        this.get_desc = () => description;
        this.get_type = () => type;
        this.get_step = () => step;    
        this.get_min  = () => min;
        this.get_max  = () => max;

        this.get_setting = () => get_function();        
        this.set_setting = (value) => set_function(map_function(value));
    }

    Setting.map_to_float = (x) => parseFloat(x);
    Setting.map_to_int = (x) => parseInt(x);
    
    settings.Setting = Setting;
    
    return settings;
    
})(settings !== undefined ? settings : {});
