/*
| A commit.
*/
'use strict';

def.attributes =
{
	// name of author
	authorName: { type: 'string', json: true },

	// seconds in epoch
	date: { type: 'number', json: true },

	// diffs for the parents
	// false: not queried
	// true: query on air
	// list: the diffs for the parents
	// not json, queried separately
	diffsList: { type: [ 'boolean', 'Yagit/Commit/Diffs/List' ], defaultValue: 'false' },

	// level in tree graph
	graphLevel: { type: 'number', json: true },

	// commit message
	message: { type: 'string', json: true },

	// parents of commit (as offset in currnet list)
	parents: { type: 'Yagit/Commit/Ref/List', json: true },

	// sha of commit
	sha: { type: 'string', json: true },

	// true is details are to be shown
	// not json
	showDetails: { type: 'boolean', defaultValue: 'false' },

	// parent (offset) to show diffs of
	// not json
	showDiffsToParent: { type: 'number', defaultValue: '0' },
};

def.json = 'Commit';

/*
| Date as js object.
*/
def.lazy.Date =
	function( )
{
	return new Date( this.date );
};

/*
| Returns the commit age as nice formated string.
|
| ~now: seconds since epoch as reference
*/
def.proto.niceAge =
	function( now )
{
	const date = this.date;
	const secs = ( now - date ) / 1000;
	if( secs <= 120 ) return Math.round( secs ) + ' secs.';

	const mins = secs / 60;
	if( mins <= 120 ) return Math.round( mins ) + ' min.';

	const hours = mins / 60;
	if( hours <= 48 ) return Math.round( hours ) + ' hours';

	const days = hours / 24;
	if( days <= 14 ) return Math.round( days ) + ' days';

	const D = this.Date;
	const year = D.getFullYear( );
	const month = D.getMonth( );
	const day = D.getDate( );
	return(
		year + '-'
		+ ( month < 10 ? '0' : '' ) + month
		+ '-' + ( day < 10 ? '0' : '' ) + day
	);
};
