/*
| Handles yagit specific adaptions to ti2c-web.
*/
'use strict';

def.attributes =
{
	// the ti2c-web instance
	_tw : { type : 'ti2c-web:Self' }
};

const fs = require( 'fs/promises' );
const { hashElement } = require( 'folder-hash' );

const Ajax = ti2c.require( 'Yagit/Server/Ajax' );
const BooleanGroup = ti2c.require( 'ti2c:boolean/group' );
const Branches = ti2c.require( 'Yagit/Server/Branches' );
const BundleBuilder = ti2c.require( 'ti2c-web:Bundle/Builder' );
const Diffs = ti2c.require( 'Yagit/Server/Diffs' );
const Dir = ti2c.require( 'Yagit/Server/Dir' );
const File = ti2c.require( 'Yagit/Server/File' );
const History = ti2c.require( 'Yagit/Server/History' );
const Listing = ti2c.require( 'Yagit/Server/Listing' );
const Log = ti2c.require( 'Log/Self' );
const Path = ti2c.require( 'Yagit/Path/Self' );
const ResourceFile = ti2c.require( 'ti2c-web:Resource/File' );
const ResourceMemory = ti2c.require( 'ti2c-web:Resource/Memory' );
const ResourceTwig = ti2c.require( 'ti2c-web:Resource/Twig' );
const Ti2cWeb = ti2c.require( 'ti2c-web:Self' );

ti2c.require( 'Yagit/Client/Root.js' );

/*
| Intercepts file requests to handle without ti2c-web.
*/
function interceptRequest( request, result, pathname )
{
	pathname = decodeURI( pathname );
	const path = Path.String( pathname );
	const parts = path.parts;

	if( parts.length === 0 ) return false;
	const p0 = parts.get( 0 );

	switch( p0 )
	{
		case 'ajax':
			Ajax.handle( request, result, path );
			return true;

		case 'branches':
			Branches.handle( request, result, path );
			return true;

		case 'diffs':
			Diffs.handle( request, result, path );
			return true;

		case 'dir':
			Dir.handle( request, result, path );
			return true;

		case 'listing':
			Listing.handle( request, result, path );
			return true;

		case 'file':
			File.handle( request, result, path );
			return true;

		case 'history':
			History.handle( request, result, path );
			return true;

		default:
			return false;
	}
}

/*
| Prepares ti2c-web.
|
| ~absolute dir of root directory.
*/
def.static.prepare =
	async function( base )
{
	Log.log( 'yagit', '*', 'preparing ti2c-web' );

	let tw =
		Ti2cWeb.create(
			'log', console.log,
			'interceptRequest', interceptRequest,
			'requestCaching', true,
		);

	// caclulates the style sheet hash
	const baseStyle = base.dir( 'media' ).dir( 'yagit' ).file( 'style.css' );
	let styleHash = await hashElement( baseStyle.asString, { } );
	styleHash = encodeURI( styleHash.hash );
	Log.log( 'yagit', '*', 'style hash: ' + styleHash );

	// calculates the pdfjs hash
	const aDirPdfjs = base.dir( 'pdfjs' );
	let pdfJsHash = await hashElement( aDirPdfjs.asString, { } );
	pdfJsHash = encodeURI( pdfJsHash.hash );
	Log.log( 'yagit', '*', 'pdfjs hash: ' + pdfJsHash );

	// calculates the prism hash
	const basePrism = base.dir( 'dist' ).dir( 'prism' );
	let prismHash = await hashElement( basePrism.asString, { } );
	prismHash = encodeURI( prismHash.hash );
	Log.log( 'yagit', '*', 'prism hash: ' + prismHash );

	const globalFlags =
		BooleanGroup.Table( {
			CHECK: true,
			NODE: false,
		} );

	const bb =
		BundleBuilder.create(
			'aFileIndex', base.d( 'media' ).d( 'yagit' ).f( 'index.html' ),
			'entry', 'gitengine:Yagit/Client/Root.js',
			'extra',
				ResourceTwig.create(
					'twig:add', 'client--extra-config.js',
					ResourceMemory.JsData(
						'var PDF_JS_HASH = "' + pdfJsHash + '";\n'
					)
				),
			'globalFlagsDevel', globalFlags,
			'globalFlagsIndex', globalFlags,
			'log', console.log,
			'name', 'client',
			'offerIndex', true,
			'offerDevel', true,
			'sameOrigin', false,
		);

	let crt = await Self._roster( base, styleHash, pdfJsHash, prismHash );
	crt = await crt.prepare( );

	const bundle = await bb.build( );
	crt = crt.appendTwig( bundle.resources );

	crt = await Self._transduce( crt, styleHash, prismHash );

	return Self.create( '_tw', tw.create( 'resources', crt ) );
};

/*
| Serves a yagit request.
|
| ~count: client counter
| ~req: request
| ~res: result
| ~urlSplit: url splitted into parts
*/
def.proto.serve =
	async function( count, req, res, urlSplit )
{
	this._tw.requestListener( req, res );
};

/*
| The basic roster.
*/
def.static._roster =
	async function( base, styleHash, pdfJsHash, prismHash )
{
	const aDirMediaYagit = base.d( 'media' ).d( 'yagit' ) ;
	const aDirPrism = base.d( 'dist' ).d( 'prism' ) ;

	let rt = ResourceTwig.create(
		'twig:add', styleHash + '-style.css',
		ResourceFile.AFileLong( aDirMediaYagit.f( 'style.css' ) ),

		'twig:add', prismHash + '-prism.css',
		ResourceFile.AFileLong( aDirPrism.f( 'prism.css' ) ),

		'twig:add', prismHash + '-prism-dev.css',
		ResourceFile.AFileLong( aDirPrism.f( 'prism-dev.css' ) ),

		'twig:add', prismHash + '-prism.js',
		ResourceFile.AFileLong( aDirPrism.f( 'prism.js' ) ),

		'twig:add', prismHash + '-prism-dev.js',
		ResourceFile.AFileLong( aDirPrism.f( 'prism-dev.js' ) ),
	);

	// adds pdfjs
	const aDirPdfjs = base.dir( 'pdfjs' );
	const subDirNames =
	[
		'build',
		'web',
		'web/cmaps',
		'web/images',
		'web/standard_fonts'
	];

	const skips =
	{
		'LICENSE': true,
		'LICENSE_FOXIT': true,
		'LICENSE_LIBERATION': true,
	};

	for( let subDirName of subDirNames )
	{
		let subDir;

		subDir = aDirPdfjs;
		for( let dirName of subDirName.split( '/' ) )
		{
			subDir = subDir.dir( dirName );
		}

		const dir = await fs.readdir( subDir.asString, { withFileTypes: true } );

		for( let dirent of dir )
		{
			if( !dirent.isFile( ) ) continue;

			const filename = dirent.name;

			if( skips[ filename ] ) continue;
			if( filename.endsWith( '.swp' ) ) continue;

			rt = rt.create(
				'twig:add', 'pdfjs-' + pdfJsHash + '/' + subDirName + '/' + filename,
				ResourceFile.AFileLong( subDir.f ( filename ) ),
			);
		}
	}

	return rt;
};

/*
| PostProcessor.
*/
def.static._transduce =
	function( crt, styleHash, prismHash )
{
	const prism =
	[
		'<link rel="stylesheet" href="' + prismHash + '-prism.css" type="text/css"/>',
		'<script type="text/javascript" src="' + prismHash + '-prism.js"></script>'
	];

	const style =
		'<link rel="stylesheet" href="' + styleHash + '-style.css" type="text/css"/>\n';

	{
		let res = crt.get( 'devel.html' );
		let data = res.data + '';
		data = data.replace( /<!--STYLE.*>/, style );
		data = data.replace( /<!--PRISM.*>/, prism.join( '\n' ) );
		res = res.create( 'data', data );
		crt = crt.set( 'devel.html', res );
	}

	{
		let res = crt.get( 'index.html' );
		let data = res.data + '';
		data = data.replace( /<!--STYLE.*>/, style );
		data = data.replace( /<!--PRISM.*>/, prism.join( '\n' ) );
		res = res.create( 'data', data );
		crt = crt.set( '', res ).set( 'index.html', res );
	}

	return crt;
};
