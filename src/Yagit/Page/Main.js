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

import { Self as Branches } from '{Yagit/Client/Branches}';
import { Self as Dir } from '{Yagit/Client/Dir}';
import { Self as File } from '{Yagit/Client/File}';
import { Self as History } from '{Yagit/Client/History}';
import { Self as Path } from '{Yagit/Path/Self}';
import { Self as Place } from '{Yagit/Client/Place}';
import { Self as Top } from '{Yagit/Page/Top}';

/*
| Expands or collapses details in the history tree.
|
| ~rowOffset: entry number of row.
*/
const historyRowClick =
	function( rowOffset )
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
};

/*
| Expands or collapses details in the history tree.
|
| ~rowOffset: entry number of row.
| ~pno: parent number to show diffs for
*/
const historyParentClick =
	function( rowOffset, pno )
{
	let pageMain = root.pageMain;
	let history = pageMain.history;
	let commits = history.commits;
	let commit = commits.get( rowOffset );

	commit = commit.create( 'showDiffsToParent', pno );
	commits = commits.set( rowOffset, commit );
	history = history.create( 'commits', commits );
	pageMain = pageMain.create( 'history', history );
	root.create( 'pageMain', pageMain );
	pageMain.show( );
};

/*
| Received a fetch branches reply.
*/
def.proto.onFetchBranches =
	function( branches, error )
{
	if( error ) return root.error( error );

	let place = this.place;
	let path = place.path;

	const defaultName = branches.defaultName;

	if( !defaultName )
	{
		// repository is empty
		const pageMain = root.pageMain.create( 'branches', branches );
		root.create( 'pageMain', pageMain );
		root.teleport( place );
		return;
	}

	if( path.length < 2 )
	{
		path = path.append( 'b:' + branches.defaultName );
		place = place.create( 'path', path );
	}

	const pageMain = root.pageMain.create( 'branches', branches );
	root.create( 'pageMain', pageMain );
	root.teleport( place );
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
| Generates a prism token.
|
| FIXME args
*/
def.static._prismToken =
	function( token, context )
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
			for( let token of content )
			{
				Self._prismToken( token, context );
			}
			return;
		}
	}

	for( let a = 0, alen = clines.length; a < alen; a++ )
	{
		if( a > 0 )
		{
			context.divLineContent = Self._fileNewLine( context.rows, context.stripe );
			context.stripe = ( context.stripe + 1 ) % 2;
		}

		if( typeof( token ) === 'string' )
		{
			const tn = document.createTextNode( clines[ a ] );
			context.divLineContent.appendChild( tn );
		}
		else
		{
			const spanToken = document.createElement( 'span' );
			context.divLineContent.appendChild( spanToken );
			spanToken.classList.add( 'token', token.type );
			spanToken.textContent = clines[ a ];
		}
	}
};

/*
| Shows the page in body
*/
def.proto.show =
	function( )
{
	const place = this.place;

	let optView = place.options.get( 'view' );
	if( optView ) optView = decodeURI( optView );

	let path = place.path;
	const repository = path.get( 0 );
	let filename;
	if( !path.slash ) filename = path.get( path.length - 1 );

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

	let branchName = path.length > 1 && path.get( 1 );
	let commitSha;

	if( !branchName )
	{
		// repository has no branches -> fully empty.
		this._showEmpty( );
		return;
	}

	if( branchName.startsWith( 'b:' ) )
	{
		branchName = branchName.substr( 2 );
		commitSha = branches.branches.get( branchName );
	}
	else if( branchName.startsWith( 'c:' ) )
	{
		commitSha = branchName;
	}
	else
	{
		root.error( 'invalid branch/commit' );
		return;
	}

	if( path.length < 2 )
	{
		path = path.append( commitSha );
	}

	const dirPath = path.slash ? path : path.shorten;
	const dirPathResolved = dirPath.set( 1, commitSha );

	if(
		!dir
		|| !dir.entries
		|| dir.path !== dirPathResolved
	)
	{
		dir = Dir.create( 'path', dirPathResolved );
		const pageMain = root.pageMain.create( 'dir', dir );
		root.create( 'pageMain', pageMain );
		dir.fetch( 'pageMain', 'onFetchDir' );
		return;
	}

	const filePathResolved = path.set( 1, commitSha );

	if(
		!path.slash
		&& ( !file || file.path !== filePathResolved )
	)
	{
		let fileEntry;
		for( let e of dir.entries )
		{
			if( e.name === filename )
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
				'path', filePathResolved,
				'type', fileEntry.type,
			);

		const pageMain = root.pageMain.create( 'file', file );
		root.create( 'pageMain', pageMain );

		if( file.type === 'text' )
		{
			file.fetch( 'pageMain', 'onFetchFile', 'text' );
			return;
		}
		else
		{
			pageMain.show( );
			return;
		}
	}

	if( optView === 'history' )
	{
		let historyAll, historyN;
		const optN = place.options.get( 'n' );
		if( optN !== undefined )
		{
			if( optN === 'all' )
			{
				historyAll = true;
			}
			else
			{
				historyN = parseInt( optN, 10 );
				if( '' + historyN !== optN || historyN < 0 ) historyN = undefined;
			}
		}

		if(
			!history
			|| history.path !== path
			|| history.commitSha !== commitSha
			|| !history.commits
			|| ( historyN && historyN !== history.commits.length )
			|| ( historyAll && history.total !== history.commits.length )
		)
		{
			if( !history || history.path !== path || history.commitSha !== commitSha )
			{
				history =
					History.create(
						'commitSha', commitSha,
						'path', path,
					);
			}

			const pageMain = root.pageMain.create( 'history', history );
			root.create( 'pageMain', pageMain );
			history.fetch(
				historyAll ? 'all' : ( historyN || 50 ),
				'pageMain', 'onFetchHistory'
			);
			return;
		}
	}

	let divTop = document.getElementById( 'divTop' );
	let divBottom, linkUp, divLeft, divRight;
	const body = document.body;

	if( !divTop || !body.classList.contains( 'pageMain' ) )
	{
		divTop =
			Top.div( divTop, this.username, place, file, branches, 'branch', branchName, true );

		divBottom = document.createElement( 'div' );
		divBottom.id = 'divBottom';

		linkUp = document.createElement( 'a' );
		linkUp.id = 'mainLinkUp';

		divLeft = document.createElement( 'div' );
		divLeft.id = 'mainDivLeft',

		divRight = document.createElement( 'div' );
		divRight.id = 'divRight';

		divBottom.replaceChildren( linkUp, divLeft, divRight );
		body.replaceChildren( divTop, divBottom );
		body.className = 'pageMain';
	}
	else
	{
		divTop =
			Top.div( divTop, this.username, place, file, branches, 'branch', branchName, true );

		divBottom = document.getElementById( 'divBottom' );
		linkUp = document.getElementById( 'mainLinkUp' );
		divLeft = document.getElementById( 'mainDivLeft' );
		divRight = document.getElementById( 'divRight' );
	}

	if( path.length > 2 )
	{
		if( path.length > 3 && !path.slash )
		{
			linkUp.href = Place.Path( path.shorten.shorten ).hash;
		}
		else
		{
			linkUp.href = Place.Path( path.shorten ).hash;
		}
		linkUp.href = Place.Path( path.shorten ).hash;
	}
	else
	{
		linkUp.href = Place.Path( Path.Empty ).hash;
	}
	linkUp.textContent = '↩';
	linkUp.title = 'up';

	let dotDotRef;
	if( path.length > 3 || ( path.length === 3 && path.slash ) )
	{
		if( path.length > 3 && !path.slash )
		{
			dotDotRef = Place.Path( path.shorten.shorten ).hash;
		}
		else
		{
			dotDotRef = Place.Path( path.shorten ).hash;
		}
	}

	this._showLeft( divLeft, dirPath, dotDotRef, dir );

	if( optView === 'history' )
	{
		divRight.setAttribute( 'class', 'history' );
		this._showRightHistory( divRight );
	}
	else if( !path.slash )
	{
		divRight.setAttribute( 'class', 'file' );

		if( file.isImage )
		{
			this._showRightImageFile( divRight );
		}
		else if( file.isPdf )
		{
			this._showRightPdfFile( divRight );
		}
		else
		{
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
| ~dirPath:    the dirPath to show
| ~upHRef:     up hyperlink reference
| ~dir:        the dir info to show
*/
def.proto._showLeft =
	function( divLeft, dirPath, upHRef, dir )
{
	const divLeftInner = document.createElement( 'div' );
	divLeftInner.id = 'mainDivLeftInner';

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
		link.href = Place.Path( dirPath.append( e.name ) ).hash;
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
		link.href = Place.PathOptions( dirPath.appendFile( e.name ) ).hash;
		divLeftInner.appendChild( divDirEntry );
	}

	divLeft.replaceChildren( divLeftInner );
};

/*
| Adds a line to a text file view.
|
| ~rows: Array to push the line div onto.
| ~stripe: stripe color class 0 or 1.
*/
def.static._fileNewLine =
	function( rows, stripe )
{
	const divLine = document.createElement( 'div' );
	divLine.classList.add( 'fileLine', 'stripe' + stripe );

	const divLineNr = document.createElement( 'div' );
	divLine.appendChild( divLineNr );
	divLineNr.classList.add( 'lineNr' );
	const lineNr = rows.length + 1;
	divLineNr.textContent = lineNr;

	const divLineContent = document.createElement( 'div' );
	divLine.appendChild( divLineContent );
	divLineContent.classList.add( 'lineContent' );

	rows.push( divLine );

	divLine.onmouseover = ( ) => { divLineNr.classList.add( 'hover' ); };
	divLine.onmouseout = ( ) => { divLineNr.classList.remove( 'hover' ); };

	return divLineContent;
};

/*
| Shows an empty repository.
*/
def.proto._showEmpty =
	function( )
{
	const divTop =
		Top.div(
			undefined,
			this.username,
			this.place,
			undefined,
			undefined,
			'branch',
			undefined,
			false
		);

	const divBottom = document.createElement( 'div' );
	divBottom.id = 'divBottom';

	divBottom.textContent = 'repository is empty.';
	divBottom.className = 'repositoryEmpty';

	const body = document.body;
	body.replaceChildren( divTop, divBottom );
	body.className = 'pageEmpty';
};

/*
| Shows the right view as unknown binary file.
*/
def.proto._showRightBinaryFile =
	function( divRight )
{
	const divMessage = document.createElement( 'div' );
	divMessage.classList.add( 'fileBinaryMessage' );
	divMessage.textContent = 'binary file';
	divRight.replaceChildren( divMessage );
};

/*
| Shows the right view as image file.
|
| ~divRight: div to fill into.
*/
def.proto._showRightImageFile =
	function( divRight )
{
	const file = this.file;

	const img = document.createElement( 'img' );
	img.classList.add( 'fileImage' );
	img.src = file.url;
	divRight.replaceChildren( img );
};

/*
| Shows the right view as pdf viewer file.
|
| ~divRight: div to fill into.
*/
def.proto._showRightPdfFile =
	function( divRight )
{
	const file = this.file;

	const iframe = document.createElement( 'iframe' );
	iframe.setAttribute( 'file', encodeURI( file.url ) );
	iframe.id = 'pdfViewer';
	//iframe.src = '/pdfjs-' + PDF_JS_HASH + '/web/viewer.html?file=' + encodeURI( file.url );
	iframe.src = '/pdfjs-' + PDF_JS_HASH + '/web/viewer.html';
	divRight.replaceChildren( iframe );
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

	// limit text display to a megabyte
	if( file.data.length > 1024 * 1024 )
	{
		// its probably too large to display
		const divMessage = document.createElement( 'div' );
		divMessage.classList.add( 'fileBinaryMessage' );
		divMessage.textContent = 'text(?) file too large to show here';
		divRight.replaceChildren( divMessage );
		return;
	}

	const highlighter = file.highlighter;

	if( highlighter )
	{
		const tokens = Prism.tokenize( file.data, Prism.languages[ highlighter ] );

		// context for recursive caller
		// FIXME: actually make this it's own class.
		const context =
		{
			stripe: 1,
			divLineContent: Self._fileNewLine( rows, 0 ),
			rows: rows,
		};

		for( let token of tokens )
		{
			Self._prismToken( token, context );
		}
	}
	else
	{
		const text = file.data;
		const content = text.split( '\n' );

		let stripe = 0;
		for( let line of content )
		{
			const divLineContent = Self._fileNewLine( rows, stripe );
			divLineContent.textContent = line;
			stripe = ( stripe + 1 ) % 2;
		}
	}

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
	const place = this.place;
	const clen = commits.length;

	let divHistory = document.getElementById( 'divHistory' );
	if( !divHistory )
	{
		divHistory = document.createElement( 'div' );
		divRight.replaceChildren( divHistory );
		divHistory.id = 'divHistory';
	}

	let divHistoryRows = [ ];
	{
		// shows the header row
		const divHistoryHeader = document.createElement( 'div' );
		divHistoryHeader.classList.add( 'header' );
		divHistoryRows.push( divHistoryHeader );

		const divTreeMount = document.createElement( 'div' );
		divHistoryHeader.appendChild( divTreeMount );
		divTreeMount.classList.add( 'treeMount' );

		const divAuthor = document.createElement( 'div' );
		divHistoryHeader.appendChild( divAuthor );
		divAuthor.classList.add( 'author' );
		divAuthor.textContent = 'Author';

		const divMessage = document.createElement( 'div' );
		divHistoryHeader.appendChild( divMessage );
		divMessage.classList.add( 'message' );
		divMessage.textContent = 'Message';

		const divAge = document.createElement( 'div' );
		divHistoryHeader.appendChild( divAge );
		divAge.classList.add( 'age' );
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
			divRow.classList.add( 'row', 'stripe' + stripe );
			stripe = ( stripe + 1 ) % 2;

			const divTreeMount = document.createElement( 'div' );
			divRow.appendChild( divTreeMount );
			divTreeMount.classList.add( 'treeMount' );

			const divAuthor = document.createElement( 'div' );
			divRow.appendChild( divAuthor );
			divAuthor.classList.add( 'author' );
			divAuthor.textContent = commit.authorName;

			const divMessage = document.createElement( 'div' );
			divRow.appendChild( divMessage );
			divMessage.classList.add( 'message' );
			divMessage.textContent = commit.message;

			const divAge = document.createElement( 'div' );
			divRow.appendChild( divAge );
			divAge.classList.add( 'age' );
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
				divHistoryDetailsRow.classList.add( 'detailsRow' );

				const divTreeMount = document.createElement( 'div' );
				divHistoryDetailsRow.appendChild( divTreeMount );
				divTreeMount.classList.add( 'treeMount' );

				const divHistoryDetailsContent = document.createElement( 'div' );
				divHistoryDetailsRow.appendChild( divHistoryDetailsContent );
				divHistoryDetailsContent.classList.add( 'detailsContent' );

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
					for( let p = parents.length - 1; p >= 0; p-- )
					{
						const parent = parents.get( p );
						const divParent = document.createElement( 'div' );
						divCommitOverviewRow.appendChild( divParent );
						divParent.textContent = parent.sha.substring( 0, 9 );
						divParent.classList.add( 'divCommitParentId' );
						if( p === commit.showDiffsToParent )
						{
							divParent.classList.add( 'active' );
						}
						if( parents.length > 1 )
						{
							divParent.classList.add( 'clickable' );
							divParent.onclick = historyParentClick.bind( undefined, c, p );
						}
					}
				}

				const pOffset = commit.showDiffsToParent;
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
	}

	const missing = history.total - commits.length;
	if( missing > 0 )
	{
		const divEllipsis = document.createElement( 'div' );
		divEllipsis.classList.add( 'ellipsis' );
		divEllipsis.textContent = '⋮';

		const divMoreLinks = document.createElement( 'div' );
		divMoreLinks.classList.add( 'moreLinks' );

		if( missing > 50 )
		{
			const aLoadMore = document.createElement( 'a' );
			aLoadMore.classList.add( 'loadMore' );
			aLoadMore.textContent = '50 more';
			aLoadMore.href =
				place
				.setOption( 'n', '' + ( commits.length + 50 ) )
				.hash;

			const spanSep = document.createElement( 'span' );
			spanSep.classList.add( 'sep' );
			divMoreLinks.replaceChildren( aLoadMore, spanSep );
		}

		const aLoadAll = document.createElement( 'a' );
		aLoadAll.classList.add( 'loadAll' );
		aLoadAll.textContent = 'all remaining ' + missing;
		aLoadAll.href =
			aLoadAll.href =
				place
				.setOption( 'n', 'all' )
				.hash;
		divMoreLinks.appendChild( aLoadAll );

		divHistoryRows.push( divEllipsis, divMoreLinks );
	}

	divHistory.replaceChildren.apply( divHistory, divHistoryRows );

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

			for( let p = 0, plen = parents.length; p < plen; p++ )
			{
				const parent = parents.get( p );
				const pOffset = parent.offset;
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
					x2 = treeX + parent.graphLevel * treeSpread;
					y2 = rows[ pOffset ].y + row.h / 2;
				}

				const svgPolyline =
					document.createElementNS( 'http://www.w3.org/2000/svg', 'polyline' );
				svgElements.push( svgPolyline );

				const points = svgPolyline.points;
				svgPolyline.setAttribute( 'stroke', 'black' );
				if( commit.showDetails && p === commit.showDiffsToParent )
				{
					svgPolyline.setAttribute( 'stroke-width', '0.5rem' );
				}

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

