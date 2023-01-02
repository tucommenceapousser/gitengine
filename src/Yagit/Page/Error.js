/*
| Shows all kind of bailing out errors.
*/
'use strict';

def.attributes =
{
	message: { type: 'string' },
};

/*
| Shows the page in body.
*/
def.proto.show =
	function( )
{
	const divError = document.createElement( 'div' );
	divError.id = 'divError';
	divError.textContent = this.message;
	document.body.replaceChildren( divError );

	// XXX make a back button.

	/*
	document.body.innerHTML =
		'<div id="errorDiv" style="margin: 3em auto 0 auto; width: 10em">'
		+ this.message + '</br>' + '</br>'
		+ '<a href="/">Reconnect</a>'
		+ '</div>';
	*/
};
