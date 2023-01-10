/*
| A file info.
*/
'use strict';

def.attributes =
{
	// commit sha to query for
	commitSha: { type: 'string' },

	// file data
	data: { type: [ 'undefined', 'string', 'protean' ] },

	// path of the file fir
	// must be a non trailing slash path
	path: { type: 'Yagit/Path/Self' },

	// "text" or "binary"
	type: { type: 'string' }
};

/*
| Fetches the file from server.
|
| ~page: page to call on reply.
| ~on: function to call on reply.
*/
def.proto.fetch =
	async function( page, on )
{
	const path = this.path;

/**/if( CHECK && path.slash ) throw new Error( );

	const url =
		'/file/'
		+ path.get( 0 ) + '/'
		+ this.commitSha + '/'
		+ path.chop.string;

	const response = await fetch( url, { headers: { 'x-session': root.session } } );
	const text = await response.text( );

	let file = this.create( 'data', text );

	root[ page ][ on ]( file, undefined );
};
