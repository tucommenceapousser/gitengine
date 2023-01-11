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

	// repository of the directoy
	repository: { type: 'string' },

	// total commits in repository
	total: { type: [ 'undefined', 'number' ] },
};

const DiffsList = tim.require( 'Yagit/Commit/Diffs/List' );
const ReplyHistory = tim.require( 'Yagit/Reply/History' );

/*
| Fetches history.
|
| ~page: page to call on reply.
| ~on: function to call on reply.
*/
def.proto.fetch =
	async function( page, on )
{
	const url = '/history/' + this.repository + '/' + this.commitSha;
	const response = await fetch( url );
	const text = await response.text( );
	const reply = ReplyHistory.FromJson( JSON.parse( text ) );
	const commits = reply.commits;

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

	const url = '/diffs/' + this.repository + '/' + commit.sha;
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
		this.repository === obj.repository
		&& this.commitSha === obj.commitSha
	);
};
