/*
| The servers encountered an error with the request.
*/
'use strict';

def.attributes =
{
	// the error message
	message: { type: 'string', json: true }
};

def.json = 'ReplyError';

/*
| Shortcut.
*/
def.static.Message = ( message ) => Self.create( 'message', message );
