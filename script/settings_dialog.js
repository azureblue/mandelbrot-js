$(function () {
    var renderers = plane.list_renderers();
    var renderer = renderers[0];
    
    var settings = [].concat(plane.list_settings(), renderer.list_settings());

    var create_form = function () {

	var html = [];
        html.push(
                '<div id="dialog-form" title="Settings"> \
                    <form onsubmit="function(event) {event.preventDefault();}"> \
                        <fieldset>'
                );

	for (var i = 0; i < settings.length; i++) {
	    html.push("<label>" + settings[i].get_description() + '</label>');
	    html.push('<input type="number" name="' + settings[i].get_name() 
                    + '" value="' + settings[i].get_setting() 
                    + '" id="id_' + settings[i].get_name() 
                    + '" step="' + settings[i].get_step() 
                    + '" class="text ui-widget-content ui-corner-all">');
	}

	html.push('<input type="submit" tabindex="-1" style="position:absolute; top:-1000px"> \
		</fieldset> \
	    </form> \
	</div>');
        
	return html.join("");
    };
    function create_dialog() {
	var dialog =  $(create_form(renderer)).dialog({
	    autoOpen: false,
	    height: 500,
	    width: 350,
	    modal: true,
	    buttons: {
		"Ok": function () {
		    for (var i = 0; i < settings.length; i++) {
			settings[i].set_setting($("#id_" + settings[i].get_name()).val());
		    }

		    dialog.dialog("destroy");
		    
			//plane.redraw();
		    
		},
		Cancel: function () {
		    plane.start_drawing();
		    dialog.dialog("destroy");
		}
	    },
	    close: function () {
		plane.start_drawing();
		dialog.dialog("destroy");
	    }
	});
	return dialog;
    }

    $("#overlay_canvas").mousedown(function (e) {
	e.preventDefault();
	if (e.button === 2) {
	    plane.pause();
	    create_dialog().dialog("open");
	}
    });
});