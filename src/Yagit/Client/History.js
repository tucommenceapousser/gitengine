/*
| History data (cached in the client)
*/
'use strict';

def.attributes =
{
	// historic commit data
	commits: { type: [ 'undefined', 'Yagit/Commit/List' ] },

	// commit sha to query for / queried for
	commitSha: { type: 'string' },

	// offset to request / requested
	offset: { type: [ 'undefined', 'number' ] },

	// path of the history
	path: { type: 'Yagit/Path/Self' },

	// total commits on path
	total: { type: [ 'undefined', 'number' ] },
};

const DiffsList = ti2c.require( 'Yagit/Commit/Diffs/List' );
const ReplyHistory = ti2c.require( 'Yagit/Reply/History' );

/*
| Fetches history.
|
| ~n: load up until this.
| ~page: page to call on reply.
| ~on: function to call on reply.
*/
def.proto.fetch =
	async function( n, page, on )
{
	let commits = this.commits;
	const cOffset = commits ? commits.length : 0;

	const url =
		'/history/'
		+ this.path.get( 0 ) + '/'
		+ this.commitSha + '/'
		+ cOffset + '/'
		+ n;
	const response = await fetch( url );
	const text = await response.text( );
	const reply = ReplyHistory.FromJson( JSON.parse( text ) );

	const rCommits = reply.commits;
	if( !commits )
	{
		commits = rCommits;
	}
	else
	{
		if( commits.length !== reply.offset )
		{
			throw new Error( 'invalid history reply' );
		}
		commits = commits.appendList( rCommits );
	}

	let history =
		this.create(
			'commits', commits,
			'total', reply.total,
		);

	root[ page ][ on ]( history, undefined );
};

/*
| Fetches the diffs for a commit in the history.
|
| ~commitOffset: offset in commits.
| ~
*/
def.proto.fetchDiffsList =
	async function( commitOffset, page, on )
{
	const commit = this.commits.get( commitOffset );
	if( commit.diffList )
	{
		// already fetched.
		root[ page ][ on ]( this, undefined );
		return;
	}

	const url = '/diffs/' + this.path.get( 0 ) + '/' + commit.sha;
	const response = await fetch( url, { headers: { 'x-session': root.session } } );
	const text = await response.text( );
	const reply = DiffsList.FromJson( JSON.parse( text ) );

	// "this" might have get another update already
	let history = root[ page ].history;
	if( !this.matches( history ) ) return;

	history =
		history.create(
			'commits',
				history.commits.set(
					commitOffset,
					commit.create( 'diffsList', reply )
				)
		);

	root[ page ][ on ]( history, undefined );
};

/*
| True if this object is the same reposity/base commit as another.
*/
def.proto.matches =
	function( obj )
{
	return(
		this.path === obj.path
		&& this.commitSha === obj.commitSha
	);
};
