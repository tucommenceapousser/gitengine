/*
| Handles the top bar.
|
| used on PageMain and PageListing.
*/
'use strict';

def.abstract = true;

const Ajax = tim.require( 'Yagit/Client/Ajax' );
const Place = tim.require( 'Yagit/Client/Place' );
const RequestLogout = tim.require( 'Yagit/Request/Logout' );

/*
| Returns the div to add on the top
*/
def.static.div =
	function( divTop, username, path, file, branches, refType, refName, hasHistory )
{

/**/if( CHECK && arguments.length !== 8 ) throw new Error( );

	if( !divTop )
	{
		divTop = document.createElement( 'div' );
		divTop.id = 'divTop';
	}

	divTop.replaceChildren( );

	// building the path
	const divPath = document.createElement( 'div' );
	divTop.appendChild( divPath );
	divPath.id = 'path';
	Self._divPath( divPath, path, file );

	// divPanelButtons
	const divPanelButtons = document.createElement( 'div' );
	divTop.appendChild( divPanelButtons );
	divPanelButtons.id = 'divPanelButtons';

	if( branches )
	{
		const linkBranches = document.createElement( 'a' );
		divPanelButtons.appendChild( linkBranches );

		const svgIcon = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
		svgIcon.classList.add( 'icon' );
		const svgPath = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
		svgIcon.setAttribute( 'viewBox', '0 0 512 512' );
		svgPath.setAttribute( 'fill', 'black' );
		svgPath.setAttribute( 'd',
			'M416,160a64,64,0,1,0-96.27,55.24c-2.29,29.08-20.08,37-75,48.42-17.76,3.68-35.93,'
			+ '7.45-52.71,13.93V151.39a64,64,0,1,0-64,0V360.61a64,64,0,1,0,64.42.24c2.39-18,'
			+ '16-24.33,65.26-34.52,27.43-5.67,55.78-11.54,79.78-26.95,29-18.58,44.53-46.78,'
			+ '46.36-83.89A64,64,0,0,0,416,160ZM160,64a32,32,0,1,1-32,32A32,32,0,0,1,160,'
			+ '64Zm0,384a32,32,0,1,1,32-32A32,32,0,0,1,160,448ZM352,192a32,32,0,1,1,32-32A32,'
			+ '32,0,0,1,352,192Z'
		);
		svgIcon.replaceChildren( svgPath );

		const spanBranchName = document.createElement( 'span' );
		spanBranchName.textContent = refName;

		linkBranches.id = 'linkBranches';
		linkBranches.title = 'branches';
		linkBranches.replaceChildren( svgIcon, spanBranchName );
		linkBranches.onclick = Self._branchesClick.bind( undefined, branches, refName );
	}

	if( hasHistory )
	{
		const linkHistory = document.createElement( 'a' );
		divPanelButtons.appendChild( linkHistory );
		linkHistory.id = 'linkHistory';
		linkHistory.textContent = '⌚';
		linkHistory.title = 'history';
		linkHistory.href =
			Place.PathOptions(
				path.truncate( 2 ), // FIXME actually keep the full path for history
				'view', 'history',
			).hash;
	}

	const linkSettings = document.createElement( 'a' );
	divPanelButtons.appendChild( linkSettings );
	linkSettings.id = 'linkSettings';
	linkSettings.textContent = '👤';
	linkSettings.title = 'settings';
	linkSettings.onclick = Self._settingsClick.bind( undefined, username );
	return divTop;
};

/*
| The branches button has been clicked.
*/
def.static._branchesClick =
	function( branches, refName )
{
	let divTop = document.getElementById( 'divTop' );
	let divBranches = document.getElementById( 'divBranches' );
	if( divBranches )
	{
		divTop.removeChild( divBranches );
		return;
	}

	divBranches = document.createElement( 'div' );
	divTop.appendChild( divBranches );
	divBranches.id = 'divBranches';
	divBranches.tabIndex = -1;

	let rows = [ ];
	for( let bName of branches.branches.keys )
	{
		const divRow = document.createElement( 'div' );
		rows.push( divRow );
		divRow.classList.add( 'row' ),
		divRow.textContent = bName;
	}

	divBranches.replaceChildren.apply( divBranches, rows );
	divBranches.addEventListener( 'focusout',  Self._branchesFocusOut );
	divBranches.focus( );
};

/*
| The user settings button has been clicked.
*/
def.static._settingsClick =
	function( username )
{
	let divTop = document.getElementById( 'divTop' );
	let divSettings = document.getElementById( 'divSettings' );
	if( divSettings )
	{
		divTop.removeChild( divSettings );
		return;
	}

	divSettings = document.createElement( 'div' );
	divSettings.id = 'divSettings';
	divSettings.tabIndex = -1;

	const divSettingsUserInfo = document.createElement( 'div' );
	divSettingsUserInfo.classList.add( 'settingsEntry', 'userInfo' );
	divSettingsUserInfo.textContent = username;

	const hr = document.createElement( 'hr' );

	const divSettingsLogout = document.createElement( 'div' );
	divSettingsLogout.classList.add( 'settingsEntry', 'logout' );
	divSettingsLogout.textContent = 'logout';
	divSettingsLogout.onclick = Self._logout;

	divSettings.replaceChildren( divSettingsUserInfo, hr, divSettingsLogout );
	divTop.appendChild( divSettings );

	divSettings.addEventListener( 'focusout',  Self._settingsFocusOut );
	divSettings.focus( );
};

/*
| Shows the path in the head row.
|
| ~divPath:    div to fill into
| ~path:       current path
| ~file:       file
*/
def.static._divPath =
	function( divPath, path, file )
{
	// path to overview
	const linkOverview = document.createElement( 'a' );
	divPath.appendChild( linkOverview );
	linkOverview.classList.add( 'overview' );
	linkOverview.textContent = '𐄡';
	linkOverview.href = Place.Path( path.truncate( 0 ) ).hash;

	if( path.length === 0 ) return;

	const spanSep = document.createElement( 'span' );
	divPath.appendChild( spanSep );
	spanSep.classList.add( 'sep' );
	spanSep.textContent = '/';

	// path to repository root
	const linkRoot = document.createElement( 'a' );
	divPath.appendChild( linkRoot );
	linkRoot.textContent = path.get( 0 );
	linkRoot.href = Place.Path( path.truncate( 2 ) ).hash;

	// path dirs
	for( let p = 2, plen = path.length; p < plen; p++ )
	{
		const spanSep = document.createElement( 'span' );
		divPath.appendChild( spanSep );
		spanSep.classList.add( 'sep' );
		spanSep.textContent = '/';

		const linkPathDir = document.createElement( 'a' );
		divPath.appendChild( linkPathDir );
		linkPathDir.href =
			Place.Path( path.truncate( p + 1 ) ).hash;
		linkPathDir.textContent = path.parts.get( p );
	}

	if( !path.slash && file )
	{
		const linkDownload = document.createElement( 'a' );
		linkDownload.classList.add( 'download' );
		divPath.appendChild( linkDownload );
		linkDownload.href = file.url;
		linkDownload.download = path.parts.last;
		linkDownload.textContent = '🡇 Download';
	}
};

/*
| Logout has been clicked
*/
def.static._logout =
	function( )
{
	Ajax.request(
		RequestLogout.singleton,
		undefined, 'onLogout'
	);
};

/*
| Closes the branches menue.
*/
def.static._branchesFocusOut =
	function( event )
{
	let divBranches = document.getElementById( 'divBranches' );
	let divTop = document.getElementById( 'divTop' );
	divTop.removeChild( divBranches );
};

/*
| Closes the settings menue.
*/
def.static._settingsFocusOut =
	function( event )
{
	let divSettings = document.getElementById( 'divSettings' );
	let divTop = document.getElementById( 'divTop' );
	divTop.removeChild( divSettings );
};
