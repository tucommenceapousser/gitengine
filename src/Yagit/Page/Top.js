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
	function( divTop, page, username, path, file, hasHistory )
{
	if( !divTop )
	{
		divTop = document.createElement( 'div' );
		divTop.id = 'divTop';
		divTop.classList.add( page );
	}
	else
	{
		divTop.setAttribute( 'class', 'page' );
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

	const linkHistory = document.createElement( 'a' );
	divPanelButtons.appendChild( linkHistory );
	linkHistory.id = 'linkHistory';
	linkHistory.textContent = '⌚';
	linkHistory.title = 'history';
	linkHistory.href =
		Place.PathOptions(
			path.truncate( 1 ), // FIXME actually keep the path for history
			'view', 'history',
		).hash;

	const linkSettings = document.createElement( 'a' );
	divPanelButtons.appendChild( linkSettings );
	linkSettings.id = 'linkSettings';
	linkSettings.textContent = '👤';
	linkSettings.title = 'settings';

	linkSettings.onclick = Self._settingsClick.bind( undefined, username );
	return divTop;
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

	const spanSep = document.createElement( 'span' );
	divPath.appendChild( spanSep );
	spanSep.classList.add( 'sep' );
	spanSep.textContent = '/';

	// path to repository root
	const linkRoot = document.createElement( 'a' );
	divPath.appendChild( linkRoot );
	linkRoot.textContent = path.get( 0 );
	linkRoot.href = Place.Path( path.truncate( 1 ) ).hash;

	// path dirs
	for( let p = 1, plen = path.length; p < plen; p++ )
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
| Closes the settings menue
*/
def.static._settingsFocusOut =
	function( event )
{
	let divSettings = document.getElementById( 'divSettings' );
	let divTop = document.getElementById( 'divTop' );
	divTop.removeChild( divSettings );
};
