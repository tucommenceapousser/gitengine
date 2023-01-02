/*
| Branches info of a repository
*/
'use strict';

def.attributes =
{
	// branches
	branches: { type: [ 'undefined', 'tim:string/group' ] },

	// repository
	repository: { type: 'string' },
};

const ReplyBranches = tim.require( 'Yagit/Reply/Branches' );

/*
| Fetches the dir from server.
|
| ~page: page to call on reply.
| ~on: function to call on reply.
*/
def.proto.fetch =
	async function( page, on )
{
	let url = '/branches/' + this.repository;

	const response = await fetch( url );
	if( !response.ok )
	{
		const text = await response.text( );
		root[ page ][ on ]( undefined, text );
		return;
	}

	const text = await response.text( );

	const reply = ReplyBranches.FromJson( JSON.parse( text ) );
	let dir = this.create( 'branches', reply.branches );

	root[ page ][ on ]( dir, undefined );
};
