/*
| A dir info.
*/
'use strict';

def.attributes =
{
	// path of the directory
	path: { type: 'Yagit/Path/Self' },

	// entries in the directory
	entries: { type: [ 'undefined', 'Yagit/Dir/Entry/List' ] },
};

const ReplyDir = ti2c.require( 'Yagit/Reply/Dir' );

/*
| Fetches the dir from server.
|
| ~page: page to call on reply.
| ~on: function to call on reply.
*/
def.proto.fetch =
	async function( page, on )
{
	const url = '/dir/' + this.path.string;

	const response = await fetch( url );
	if( !response.ok )
	{
		const text = await response.text( );
		root[ page ][ on ]( undefined, text );
		return;
	}

	const text = await response.text( );

	const reply = ReplyDir.FromJson( JSON.parse( text ) );
	let dir = this.create( 'entries', reply.entries );

	root[ page ][ on ]( dir, undefined );
};

