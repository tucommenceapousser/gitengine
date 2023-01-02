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

	// filename
	filename: { type: 'string' },

	// path of the file fir
	path: { type: 'Yagit/Path/Self' },

	// repository of the directoy
	repository: { type: 'string' },

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
	let url = '/file/' + this.repository + '/' + this.commitSha;
	if( path.length > 0 ) url += '/';
	url += path.string;
	if( path.length > 0 ) url += '/';
	url += this.filename;

	const response = await fetch( url );
	const text = await response.text( );

	let file = this.create( 'data', text );

	root[ page ][ on ]( file, undefined );
};
