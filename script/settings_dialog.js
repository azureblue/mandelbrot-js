var settings = (function (settings) {
    var renderers = plane.list_renderers();
    var renderer = renderers[0];
    
    var settings = [].concat(plane.list_settings(), renderer.list_settings());
    var advanced_settings = [].concat(plane.list_advanced_settings(), renderer.list_advanced_settings());

    var create_form = function () {
        
	var html = [];
        html.push(
                '<div id="dialog-form" title="Settings"> \
                    <form onsubmit="function(event) {event.preventDefault();}"> \
                        <fieldset> \
                <div id="setting-tabs"> \
                    <ul> \
                      <li><a href="#settings-basic">Basic</a></li> \
                      <li><a href="#settings-advanced">Advanced</a></li> \
                    </ul> ');
        
         html.push('<div id="settings-basic">');
         for (var i = 0; i < settings.length; i++) {
	    html.push("<label>" + settings[i].get_name() + '</label>');
	    html.push('<input type="number" name="setting_' + i 
                    + '" value="' + settings[i].get_setting() 
                    + '" id="setting_' + i 
                    + (settings[i].get_min() === undefined ? '' : '" min="' + settings[i].get_min())
                    + (settings[i].get_max() === undefined ? '' : '" max="' + settings[i].get_max())
                    + '" step="' + settings[i].get_step() 
                    + '" class="text ui-widget-content ui-corner-all">');
	}
        html.push('</div>');
        html.push('<div id="settings-advanced">');
         for (var i = 0; i < advanced_settings.length; i++) {
	    html.push("<label>" + advanced_settings[i].get_name() + '</label>');
	    html.push('<input type="number" name="advanced_setting_' + i 
                    + '" value="' + advanced_settings[i].get_setting() 
                    + '" id="advanced_setting_' + i 
                    + (advanced_settings[i].get_min() === undefined ? '' : '" min="' + advanced_settings[i].get_min())
                    + (advanced_settings[i].get_max() === undefined ? '' : '" max="' + advanced_settings[i].get_max())
                    + '" step="' + advanced_settings[i].get_step() 
                    + '" class="text ui-widget-content ui-corner-all">');
	}
        html.push('</div>');
        html.push('</div>');

	html.push('<input type="submit" tabindex="-1" style="position:absolute; top:-1000px"> \
		</fieldset> \
	    </form> \
	</div>');
        
	return html.join("");
    };
    
    function open_settings_dialog(close_callback) {
	var dialog =  $(create_form(renderer)).dialog({
	    autoOpen: false,
	    height: 500,
	    width: 350,
	    modal: true,
	    buttons: {
		"Ok": function () {
		    for (var i = 0; i < settings.length; i++) {
                        var val = $("#setting_" + i).val();
                        if (settings[i].get_setting() == val) continue;
			settings[i].set_setting(val);
		    }
                    
                    for (var i = 0; i < advanced_settings.length; i++) {
			var val = $("#advanced_setting_" + i).val();
                        if (advanced_settings[i].get_setting() == val) continue;
			advanced_settings[i].set_setting(val);
		    }

		    dialog.dialog("destroy");
                    close_callback();
		},
                
		Cancel: function () {
		    dialog.dialog("destroy");
		    close_callback();
		}
	    },
            open: function() {
                $('#setting-tabs').tabs();
            },
            
	    close: function () {
		dialog.dialog("destroy");
		close_callback();
	    }
	});
	dialog.dialog("open");
    }
    
    settings.open_settings_dialog = open_settings_dialog;
    
    return settings;
})(settings !== undefined ? settings : {});