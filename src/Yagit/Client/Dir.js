/*
| A dir info.
*/
'use strict';

def.attributes =
{
	// commit sha to query for
	commitSha: { type: 'string' },

	// path of the directory
	path: { type: 'Yagit/Path/Self' },

	// repository of the directoy
	repository: { type: 'string' },

	// entries in the directory
	entries: { type: [ 'undefined', 'Yagit/Dir/Entry/List' ] },
};

const ReplyDir = tim.require( 'Yagit/Reply/Dir' );

/*
| Fetches the dir from server.
|
| ~page: page to call on reply.
| ~on: function to call on reply.
*/
def.proto.fetch =
	async function( page, on )
{
	const path = this.path;
	let url = '/dir/' + this.repository + '/' + this.commitSha;
	if( path.length > 0 ) url += '/';
	url += path.string;
	if( path.length > 0 ) url += '/';

	const response = await fetch( url, { headers: { 'x-session': root.session } } );
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

