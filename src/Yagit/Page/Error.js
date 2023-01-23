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

	//FIXME make a back button.
};
