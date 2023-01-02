/*
| Handles the papers overview view.
*/
'use strict';

def.attributes =
{
	// repository branches information
	branches: { type: [ 'undefined', 'Yagit/Client/Branches' ] },

	// history data
	history: { type: [ 'undefined', 'Yagit/Client/History' ] },

	// file data
	file: { type: [ 'undefined', 'Yagit/Client/File' ] },

	// directory data
	dir: { type: [ 'undefined', 'Yagit/Client/Dir' ] },

	// the place the page was created for
	place: { type: 'Yagit/Client/Place' },

	// currently logged in user
	username: { type: 'string' },
};

const Branches = tim.require( 'Yagit/Client/Branches' );
const Dir = tim.require( 'Yagit/Client/Dir' );
const File = tim.require( 'Yagit/Client/File' );
const History = tim.require( 'Yagit/Client/History' );
const Path = tim.require( 'Yagit/Path/Self' );
const Place = tim.require( 'Yagit/Client/Place' );

/*
| Expands or collapses details in the history tree.
|
| ~rowOffset: entry number of row.
*/
function historyRowClick( rowOffset )
{
	let pageMain = root.pageMain;
	let history = pageMain.history;
	let commits = history.commits;
	let commit = commits.get( rowOffset );

	if( !commit.showDetails )
	{
		// turns on details for the commit
		if( !commit.diffsList )
		{
			// details need to be queried
			let history = pageMain.history;
			history =
				history.create(
					'commits',
						commits.set(
							rowOffset,
							commit.create(
								'diffsList', true,
								'showDetails', true,
							)
						)
				);
			pageMain = root.pageMain.create( 'history', history );
			history.fetchDiffsList( rowOffset, 'pageMain', 'onFetchDiffs' );
			root.create( 'pageMain', pageMain );
			pageMain.show( );
		}
		else
		{
			let history = pageMain.history;
			history =
				history.create(
					'commits',
						commits.set(
							rowOffset,
							commit.create(
								'showDetails', true,
							)
						)
				);
			pageMain = root.pageMain.create( 'history', history );
			root.create( 'pageMain', pageMain );
			pageMain.show( );
		}
	}
	else
	{
		let history = pageMain.history;
		history =
			history.create(
				'commits',
					commits.set(
						rowOffset,
						commit.create(
							'showDetails', false,
						)
					)
			);
			pageMain = root.pageMain.create( 'history', history );
			root.create( 'pageMain', pageMain );
			pageMain.show( );
	}
}

/*
| Received a fetch branches reply.
*/
def.proto.onFetchBranches =
	function( branches, error )
{
	if( error ) return root.error( error );

	const pageMain = root.pageMain.create( 'branches', branches );
	root.create( 'pageMain', pageMain );
	pageMain.show( );
};

/*
| Received a fetch dir reply.
*/
def.proto.onFetchDir =
	function( dir, error )
{
	if( error ) return root.error( error );

	const pageMain = root.pageMain.create( 'dir', dir );
	root.create( 'pageMain', pageMain );
	pageMain.show( );
};

/*
| Received a fetch diffs reply.
*/
def.proto.onFetchDiffs =
	function( history, error )
{
	if( error ) return root.error( error );

	const pageMain = root.pageMain.create( 'history', history );
	root.create( 'pageMain', pageMain );
	pageMain.show( );
};

/*
| Received a fetch file reply.
*/
def.proto.onFetchFile =
	function( file, error )
{
	if( error ) return root.error( error );

	const pageMain = root.pageMain.create( 'file', file );
	root.create( 'pageMain', pageMain );
	pageMain.show( );
};

/*
| A history fetch history reply.
*/
def.proto.onFetchHistory =
	function( history, error )
{
	if( error ) return root.error( error );

	const pageMain = root.pageMain.create( 'history', history );
	root.create( 'pageMain', pageMain );
	pageMain.show( );
};

/*
| Shows the page in body
*/
def.proto.show =
	function( )
{
	const place = this.place;
	const repository = place.page;

	let optFile = place.options.get( 'file' );
	if( optFile ) optFile = decodeURI( optFile );

	let optView = place.options.get( 'view' );
	if( optView ) optView = decodeURI( optView );

	const path = Path.String( place.options.get( 'path' ) );
	let branches = this.branches;

	if(
		!branches
		|| branches.repository !== repository
	)
	{
		branches = Branches.create( 'repository', repository );
		const pageMain = root.pageMain.create( 'branches', branches );
		root.create( 'pageMain', pageMain );
		branches.fetch( 'pageMain', 'onFetchBranches' );
		return;
	}

	let dir = this.dir;
	let file = this.file;
	let history = this.history;
	const commitSha = branches.branches.get( 'master' );

	if(
		!dir
		|| !dir.entries
		|| dir.repository !== repository
		|| dir.path !== path
	)
	{
		dir =
			Dir.create(
				'commitSha', commitSha,
				'repository', repository,
				'path', path
			);
		const pageMain = root.pageMain.create( 'dir', dir );
		root.create( 'pageMain', pageMain );
		dir.fetch( 'pageMain', 'onFetchDir' );
		return;
	}

	if(
		optFile &&
		(
			!file
			|| file.repository !== repository
			|| file.filename !== optFile
			|| file.path !== path
		)
	)
	{
		let fileEntry;
		for( let e of dir.entries )
		{
			if( e.name === optFile )
			{
				fileEntry = e;
				break;
			}
		}

		if( !fileEntry )
		{
			console.log( 'ERROR: current file not in directory!' );
			return;
		}

		file =
			File.create(
				'commitSha', commitSha,
				'filename', optFile,
				'path', path,
				'repository', repository,
				'type', fileEntry.type,
			);

		const pageMain = root.pageMain.create( 'file', file );
		root.create( 'pageMain', pageMain );

		if( file.type === 'text' )
		{
			file.fetch( 'pageMain', 'onFetchFile' );
			return;
		}
		else
		{
			pageMain.show( );
			return;
		}
	}

	if(
		optView === 'history' &&
		(
			!history
			// FIXME check other stuff
		)
	)
	{
		history =
			History.create(
				'commitSha', commitSha,
				'repository', repository,
			);

		const pageMain = root.pageMain.create( 'history', history );
		root.create( 'pageMain', pageMain );

		history.fetch( 'pageMain', 'onFetchHistory' );
		return;
	}

	let divTop = document.getElementById( 'divTop' );
	let divBottom, linkUp, divLeft, divRight;

	if( !divTop )
	{
		divTop = document.createElement( 'div' );
		divTop.id = 'divTop';

		divBottom = document.createElement( 'div' );
		divBottom.id = 'divBottom';

		linkUp = document.createElement( 'a' );
		linkUp = document.createElement( 'a' );
		linkUp.id = 'linkUp';

		divLeft = document.createElement( 'div' );
		divLeft.id = 'divLeft',

		divRight = document.createElement( 'div' );
		divRight.id = 'divRight';

		divBottom.replaceChildren( linkUp, divLeft, divRight );
		document.body.replaceChildren( divTop, divBottom );
	}
	else
	{
		divTop.replaceChildren( );
		divBottom = document.getElementById( 'divBottom' );
		linkUp = document.getElementById( 'linkUp' );
		divLeft = document.getElementById( 'divLeft' );
		divRight = document.getElementById( 'divRight' );
	}

	{
		// building the path
		const divPath = document.createElement( 'div' );
		divTop.appendChild( divPath );
		divPath.id = 'path';
		this._showPath( divPath, repository, path, optFile );
	}

	{
		// divPanelButtons
		const divPanelButtons = document.createElement( 'div' );
		divTop.appendChild( divPanelButtons );
		divPanelButtons.id = 'divPanelButtons';

		const linkHistory = document.createElement( 'a' );
		divPanelButtons.appendChild( linkHistory );
		linkHistory.id = 'linkHistory';
		linkHistory.textContent = '⌚';
		linkHistory.title = 'history';

		linkHistory.href =
			Place.PageOptions(
				repository,
				'path', path.truncate( 0 ).string,
				'view', 'history',
			).hash;
	}

	{
		if( optFile )
		{
			// if in file view 1 up is simply without file
			linkUp.href =
				Place.PageOptions(
					repository,
					'path', path.string
				).hash;
		}
		else if( path.length > 0 )
		{
			linkUp.href =
				Place.PageOptions(
					repository,
					'path', path.shorten.string
				).hash;
		}
		else
		{
			// FIXME link to overview
			linkUp.href = place.hash;
		}
		linkUp.textContent = '↩';
		linkUp.title = 'up';
	}

	let dotDotRef;
	if( path.length > 0 )
	{
		dotDotRef =
			Place.PageOptions(
				repository,
				'path', path.shorten.string
			).hash;
	}
	this._showLeft( divLeft, repository, path, dotDotRef, dir );

	if( optFile )
	{
		divRight.setAttribute( 'class', 'file' );
		switch( file.type )
		{
			case 'binary':
				this._showRightBinaryFile( divRight );
				break;

			case 'text':
				this._showRightTextFile( divRight, true );
				break;

			default: throw new Error( );
		}
	}
	else if( optView === 'history' )
	{
		divRight.setAttribute( 'class', 'history' );
		this._showRightHistory( divRight );
	}
	else
	{
		divRight.replaceChildren( );
	}
};

/*
| Shows the left side of bottom (the dir view).
|
| ~divLeft:    the left div
| ~repository: current repository
| ~path:       the path to show
| ~upHRef:     up hyperlink reference
| ~dir:        the dir info to show
*/
def.proto._showLeft =
	function( divLeft, repository, path, upHRef, dir )
{
	const divLeftInner = document.createElement( 'div' );
	divLeftInner.id = 'leftInner';

	let stripe = 0;

	// writes the '..' entry
	if( upHRef !== undefined )
	{
		const divDirEntry = document.createElement( 'div' );
		divLeftInner.appendChild( divDirEntry );
		divDirEntry.classList.add( 'dirEntry', 'stripe' + stripe );
		stripe = ( stripe + 1 ) % 2;

		const link = document.createElement( 'a' );
		divDirEntry.appendChild( link );
		link.classList.add( 'dir' );
		link.textContent = '..';
		link.href = upHRef;
	}

	const dirEntries = dir.entries;
	// writes directory entries
	for( let e of dirEntries )
	{
		if( e.type !== 'dir' ) continue;

		const divDirEntry = document.createElement( 'div' );
		divLeftInner.appendChild( divDirEntry );
		divDirEntry.classList.add( 'dirEntry', 'stripe' + stripe );
		stripe = ( stripe + 1 ) % 2;

		const link = document.createElement( 'a' );
		divDirEntry.appendChild( link );
		link.classList.add( 'dir' );
		link.textContent = e.name;
		link.href =
			Place.PageOptions(
				repository,
				'path', path.append( e.name ).string,
			).hash;
	}

	// writes file entris
	for( let a = 0, alen = dirEntries.length; a < alen; a++ )
	{
		const e = dirEntries.get( a );
		if( e.type === 'dir' ) continue;

		const divDirEntry = document.createElement( 'div' );
		divDirEntry.classList.add( 'dirEntry', 'stripe' + stripe );
		stripe = ( stripe + 1 ) % 2;

		if( this.file && this.file.filename === e.name )
		{
			divDirEntry.classList.add( 'current' );
		}

		const link = document.createElement( 'a' );
		divDirEntry.appendChild( link );
		link.classList.add( 'file' );
		link.textContent = e.name;
		link.href =
			Place.PageOptions(
				repository,
				'path', path.string,
				'file', e.name
			).hash;
		divLeftInner.appendChild( divDirEntry );
	}

	divLeft.replaceChildren( divLeftInner );
};

/*
| Shows the path in the head row.
|
| ~divPath:    div to fill into
| ~repository: current repository
| ~path:       current path
| ~optFile:    option file
*/
def.proto._showPath =
	function( divPath, repository, path, optFile )
{
	{
		// path to overview
		const linkOverview = document.createElement( 'a' );
		divPath.appendChild( linkOverview );
		linkOverview.classList.add( 'overview' );
		linkOverview.textContent = '𐄡';
		linkOverview.href = '/'; // FIXME
	}

	{
		const spanSep = document.createElement( 'span' );
		divPath.appendChild( spanSep );
		spanSep.classList.add( 'sep' );
		spanSep.textContent = '/';
	}

	{
		// path to repository root
		const linkRoot = document.createElement( 'a' );
		divPath.appendChild( linkRoot );
		linkRoot.textContent = repository;
		linkRoot.href =
			Place.PageOptions(
				repository,
				'path', path.truncate( 0 ).string
			).hash;
	}

	// path dirs
	for( let p = 0, plen = path.length; p < plen; p++ )
	{
		const spanSep = document.createElement( 'span' );
		divPath.appendChild( spanSep );
		spanSep.classList.add( 'sep' );
		spanSep.textContent = '/';

		const linkPathDir = document.createElement( 'a' );
		divPath.appendChild( linkPathDir );
		linkPathDir.href =
			Place.PageOptions(
				repository,
				'path', path.truncate( p + 1 ).string
			).hash;
		linkPathDir.textContent = path.parts.get( p );
	}

	if( optFile )
	{
		const spanSep = document.createElement( 'span' );
		divPath.appendChild( spanSep );
		spanSep.classList.add( 'sep' );
		spanSep.textContent = '/';

		const spanFile = document.createElement( 'span' );
		divPath.appendChild( spanFile );
		spanFile.textContent = optFile;
	}
};

/*
| XXX
*/
def.proto._fileNewLine =
	function( lines, rows, stripe )
{
	const divLine = document.createElement( 'div' );
	divLine.classList.add( 'fileLine', 'stripe' + stripe );

	const divLineNr = document.createElement( 'div' );
	divLine.appendChild( divLineNr );
	divLineNr.classList.add( 'lineNr' );
	const lineNr = lines.length + 1;
	divLineNr.textContent = lineNr;

	const divLineContent = document.createElement( 'div' );
	divLine.appendChild( divLineContent );
	divLineContent.classList.add( 'lineContent' );

	rows.push( divLine );

	divLine.onmouseover = ( ) => { divLineNr.classList.add( 'hover' ); };
	divLine.onmouseout = ( ) => { divLineNr.classList.remove( 'hover' ); };

	lines.push( {
		divLineNr: divLineNr,
		divLineContent: divLineContent,
	} );

	return divLineContent;
};

/*
| Shows the right view as plain text file contents.
|
| ~divRight: div to fill into.
| ~highlight: if true make syntax highlighting
*/
def.proto._showRightBinaryFile =
	function( divRight )
{
	//const file = this.file;

	const divMessage = document.createElement( 'div' );
	divMessage.classList.add( 'fileBinaryMessage' );
	divMessage.textContent = 'binary file';

	divRight.replaceChildren( divMessage );
};

/*
| Shows the right view as plain text file contents.
|
| ~divRight: div to fill into.
| ~highlight: if true make syntax highlighting
*/
def.proto._showRightTextFile =
	function( divRight, highlight )
{
	const file = this.file;
	const rows = [ ];
	const lines = [ ];

	if( highlight )
	{
		const tokens = Prism.tokenize( file.data, Prism.languages.latex );

		let stripe = 0;
		let divLineContent = this._fileNewLine( lines, rows, stripe );
		stripe = ( stripe + 1 ) % 2;

		for( let token of tokens )
		{
			let clines;

			if( typeof( token ) === 'string' )
			{
				clines = token.split( '\n' );
			}
			else
			{
				const content = token.content;
				if( typeof( content ) === 'string' )
				{
					clines = content.split( '\n' );
				}
				else
				{
					clines = content.join( ).split( '\n' );
				}
			}

			for( let a = 0, alen = clines.length; a < alen; a++ )
			{
				if( a > 0 )
				{
					divLineContent = this._fileNewLine( lines, rows, stripe );
					stripe = ( stripe + 1 ) % 2;
				}

				if( typeof( token ) === 'string' )
				{
					const tn = document.createTextNode( clines[ a ] );
					divLineContent.appendChild( tn );
				}
				else
				{
					const spanToken = document.createElement( 'span' );
					divLineContent.appendChild( spanToken );
					spanToken.classList.add( 'token', token.type );
					spanToken.textContent = clines[ a ];
				}
			}
		}

		/*
		const divLineBackground = document.createElement( 'div' );
		rows.push( divLineBackground );
		divLineBackground.id = 'lineNrBackground';
		divLineBackground.style[ 'grid-row' ] = '1 / ' + ( lines.length + 1 );
		*/

		/*
		for( let a = 1, alen = lines.length; a <= alen; a++ )
		{
			const divLineNr = document.createElement( 'div' );
			children.push( divLineNr );
			divLineNr.classList.add( 'lineNr' );
			divLineNr.style[ 'grid-row' ] = '' + a;
			divLineNr.textContent = a;
		}

		for( let a = 0, alen = lines.length; a < alen; a++ )
		{
			const divLine = lines[ a ];
			children.push( divLine );
			divLine.style[ 'grid-row' ] = '' + ( a + 1 );
		}
		*/
	}
	/*
	else
	{
		const text = file.data;
		const content = text.split( '\n' );

		const divLineBackground = document.createElement( 'div' );
		children.push( divLineBackground );
		divLineBackground.id = 'lineNrBackground';
		divLineBackground.style[ 'grid-row' ] = '1 / ' + ( content.length + 1 );

		for( let a = 1, alen = content.length; a <= alen; a++ )
		{
			const divLineNr = document.createElement( 'div' );
			children.push( divLineNr );
			divLineNr.classList.add( 'lineNr' );
			divLineNr.style[ 'grid-row' ] = '' + a;
			divLineNr.textContent = a;
		}

		for( let a = 0, alen = content.length; a < alen; a++ )
		{
			const divLine = document.createElement( 'div' );
			children.push( divLine );
			divLine.classList.add( 'lineContent' );
			divLine.style[ 'grid-row' ] = '' + ( a + 1 );
			divLine.textContent = content[ a ];
		}
	}
	*/
	divRight.replaceChildren.apply( divRight, rows );
};

/*
| Shows the right view for history views.
*/
def.proto._showRightHistory =
	function( divRight )
{
	const now = Date.now( );
	let pageMain = this;
	let history = pageMain.history;
	const commits = history.commits;
	const clen = Math.min( 50, commits.length );

	let divHistory = document.getElementById( 'divHistory' );
	if( !divHistory )
	{
		divHistory = document.createElement( 'div' );
		console.log( divRight );
		divRight.replaceChildren( divHistory );
		divHistory.id = 'divHistory';
	}

	let divHistoryRows = [ ];
	{
		// shows the header row
		const divHistoryHeader = document.createElement( 'div' );
		divHistoryHeader.id = 'divHistoryHeader';
		divHistoryRows.push( divHistoryHeader );

		const divTreeMount = document.createElement( 'div' );
		divHistoryHeader.appendChild( divTreeMount );
		divTreeMount.classList.add( 'divHistoryTreeMount' );

		const divAuthor = document.createElement( 'div' );
		divHistoryHeader.appendChild( divAuthor );
		divAuthor.classList.add( 'divHistoryAuthor' );
		divAuthor.textContent = 'Author';

		const divMessage = document.createElement( 'div' );
		divHistoryHeader.appendChild( divMessage );
		divMessage.classList.add( 'divHistoryMessage' );
		divMessage.textContent = 'Message';

		const divAge = document.createElement( 'div' );
		divHistoryHeader.appendChild( divAge );
		divAge.classList.add( 'divHistoryAge' );
		divAge.textContent = 'Age';
	}

	const treeX = 20;
	const nodeR = 6;
	const treeSpread = 15;

	// draws the rows
	const rows = [ ];
	let stripe = 0;
	for( let c = 0; c < clen; c++ )
	{
		const commit = commits.get( c );

		{
			// row main entry
			const divRow = document.createElement( 'div' );
			rows.push( { div: divRow, y: undefined, h: undefined } );
			divHistoryRows.push( divRow );
			divRow.classList.add( 'divHistoryRow', 'stripe' + stripe );
			stripe = ( stripe + 1 ) % 2;

			const divTreeMount = document.createElement( 'div' );
			divRow.appendChild( divTreeMount );
			divTreeMount.classList.add( 'divHistoryTreeMount' );

			const divAuthor = document.createElement( 'div' );
			divRow.appendChild( divAuthor );
			divAuthor.classList.add( 'divHistoryAuthor' );
			divAuthor.textContent = commit.authorName;

			const divMessage = document.createElement( 'div' );
			divRow.appendChild( divMessage );
			divMessage.classList.add( 'divHistoryMessage' );
			divMessage.textContent = commit.message;

			const divAge = document.createElement( 'div' );
			divRow.appendChild( divAge );
			divAge.classList.add( 'divHistoryAge' );
			divAge.textContent = commit.niceAge( now );

			divRow.onclick = historyRowClick.bind( undefined, c );
		}

		{
			// adds the details row
			const diffsList = commit.diffsList;
			if( commit.showDetails && typeof( diffsList ) !== 'boolean' )
			{
				const divHistoryDetailsRow = document.createElement( 'div' );
				divHistoryRows.push( divHistoryDetailsRow );
				divHistoryDetailsRow.classList.add( 'divHistoryDetailsRow' );

				const divTreeMount = document.createElement( 'div' );
				divHistoryDetailsRow.appendChild( divTreeMount );
				divTreeMount.classList.add( 'divHistoryTreeMount' );

				const divHistoryDetailsContent = document.createElement( 'div' );
				divHistoryDetailsRow.appendChild( divHistoryDetailsContent );
				divHistoryDetailsContent.classList.add( 'divHistoryDetailsContent' );

				{
					// the overview of the commit
					const divCommitOverviewRow = document.createElement( 'div' );
					divHistoryDetailsContent.appendChild( divCommitOverviewRow );
					divCommitOverviewRow.classList.add( 'divCommitOverviewRow' );

					const divCommitLabel = document.createElement( 'div' );
					divCommitOverviewRow.appendChild( divCommitLabel );
					divCommitLabel.classList.add( 'divCommitLabel' );
					divCommitLabel.textContent = 'Commit:';

					const divCommitId = document.createElement( 'div' );
					divCommitOverviewRow.appendChild( divCommitId );
					divCommitId.classList.add( 'divCommitId' );
					divCommitId.textContent = commit.sha.substring( 0, 9 );

					const divParentLabel = document.createElement( 'div' );
					divCommitOverviewRow.appendChild( divParentLabel );
					divParentLabel.classList.add( 'divCommitParentLabel' );
					divParentLabel.textContent = 'Parents:';

					const parents = commit.parents;
					for( let p of parents )
					{
						const divParent = document.createElement( 'div' );
						divCommitOverviewRow.appendChild( divParent );
						divParent.textContent = p.sha.substring( 0, 9 );
						divParent.classList.add( 'divCommitParentId' );
					}
				}

				const pOffset = 0;
				const diffs = diffsList.get( pOffset );
				const patches = diffs.patches;

				for( let patch of patches )
				{
					const divCommitPatch = document.createElement( 'div' );
					divHistoryDetailsContent.appendChild( divCommitPatch );
					divCommitPatch.classList.add( 'divCommitPatch' );

					const divCommitFilename = document.createElement( 'div' );
					divCommitPatch.appendChild( divCommitFilename );
					divCommitFilename.classList.add( 'divCommitFilename' );
					const newFile = patch.newFile;
					const oldFile = patch.oldFile;

					if( newFile === oldFile )
					{
						divCommitFilename.textContent = 'Diff: ' + newFile;
					}
					else if( newFile === undefined )
					{
						divCommitFilename.textContent = 'Deleted: ' + oldFile;
					}
					else if( oldFile === undefined )
					{
						divCommitFilename.textContent = 'Created: ' + newFile;
					}
					else
					{
						divCommitFilename.textContent =
							'Diff: ' + newFile + ' (renamed from ' + oldFile + ')';
					}

					const hunks = patch.hunks;
					for( let hunk of hunks )
					{
						const divCommitHunk = document.createElement( 'div' );
						divCommitPatch.appendChild( divCommitHunk );
						divCommitHunk.classList.add( 'divCommitPatchHunk' );

						const lines = hunk.lines;
						for( let line of lines )
						{
							const divLine = document.createElement( 'div' );
							divCommitHunk.appendChild( divLine );
							divLine.classList.add( 'divCommitPatchLine' );

							const divLineNr = document.createElement( 'div' );
							divLine.appendChild( divLineNr );
							divLineNr.classList.add( 'lineNr' );
							const lineNr =
								line.oldLineno >= 0
								? line.oldLineno
								: line.newLineno;
							divLineNr.textContent = lineNr;

							const divLineContent = document.createElement( 'div' );
							divLine.appendChild( divLineContent );
							divLineContent.classList.add( 'lineContent' );
							divLineContent.textContent = line.content;

							if( line.oldLineno < 0 ) divLine.classList.add( 'add' );
							if( line.newLineno < 0 ) divLine.classList.add( 'remove' );
						}
					}
				}
			}
		}

		divHistory.replaceChildren.apply( divHistory, divHistoryRows );
	}

	setTimeout( ( ) =>
	{
		let svgHistory = document.getElementById( 'svgHistory' );
		let svgElements = [ ];

		if( !svgHistory )
		{
			svgHistory = document.createElementNS( 'http://www.w3.org/2000/svg','svg' );
			divRight.appendChild( svgHistory );
			svgHistory.id = 'svgHistory';
		}

		// aquires size data from dom
		const y0 = divHistory.offsetTop;
		for( let row of rows )
		{
			const rowDiv = row.div;
			row.y = rowDiv.offsetTop - y0;
			row.h = rowDiv.clientHeight;
		}

		// draws the tree path
		// steepnees of diagonales, 1 is 45°, this is 60°
		const steepness = 1.732050808;
		for( let c = 0; c < clen; c++ )
		{
			const row = rows[ c ];
			const commit = commits.get( c );
			const parents = commit.parents;

			for( let p of parents )
			{
				const pOffset = p.offset;
				if( typeof( pOffset ) !== 'number' )
				{
					// FIXME
					continue;
				}

				const x1 = treeX + commit.graphLevel * treeSpread;
				const y1 = row.y + row.h / 2;
				let x2, y2;
				if( pOffset >= clen )
				{
					const lastRow = rows[ rows.length - 1 ];
					x2 = x1;
					y2 = lastRow.y + lastRow.h;
				}
				else
				{
					x2 = treeX + p.graphLevel * treeSpread;
					y2 = rows[ pOffset ].y + row.h / 2;
				}

				const svgPolyline =
					document.createElementNS( 'http://www.w3.org/2000/svg', 'polyline' );
				svgElements.push( svgPolyline );

				const points = svgPolyline.points;
				svgPolyline.setAttribute( 'stroke', 'black' );

				const p1 = svgHistory.createSVGPoint( );
				const p2 = svgHistory.createSVGPoint( );

				p1.x = x1; p1.y = y1;
				p2.x = x2; p2.y = y2;

				const dx = x2 - x1;
				const dy = y2 - y1;

				if( dx === 0 )
				{
					points.appendItem( p1 );
					points.appendItem( p2 );
				}
				else if( dx > 0 )
				{
					if( dx * steepness > dy )
					{
						// if its steep leave it as is
						points.appendItem( p1 );
						points.appendItem( p2 );
					}
					else
					{
						const pm1 = svgHistory.createSVGPoint( );
						pm1.x = x2;
						pm1.y = y1 + dx * steepness;
						points.appendItem( p1 );
						points.appendItem( pm1 );
						points.appendItem( p2 );
						points.appendItem( pm1 );
					}
				}
				else
				{
					if( -dx * steepness > dy )
					{
						points.appendItem( p1 );
						points.appendItem( p2 );
					}
					else
					{
						const pm1 = svgHistory.createSVGPoint( );
						pm1.x = x1;
						pm1.y = y2 + dx * steepness;
						points.appendItem( p1 );
						points.appendItem( pm1 );
						points.appendItem( p2 );
						points.appendItem( pm1 );
					}
				}
			}
		}

		// draws the nodes (in front of the paths)
		for( let c = 0; c < clen; c++ )
		{
			const commit = commits.get( c );
			const row = rows[ c ];
			const svgNode = document.createElementNS( 'http://www.w3.org/2000/svg', 'circle' );
			svgElements.push( svgNode );
			svgNode.classList.add( 'svgTreeNode' );
			svgNode.setAttribute( 'cx', treeX + commit.graphLevel * treeSpread );
			svgNode.setAttribute( 'cy', row.y + row.h / 2 );
			svgNode.setAttribute( 'r', nodeR );
		}

		const lastRow = rows[ clen - 1 ];
		svgHistory.replaceChildren.apply( svgHistory, svgElements );
		svgHistory.setAttribute( 'height', lastRow.y + lastRow.h );
	}, 0 );
};

