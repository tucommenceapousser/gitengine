/*
| Handles yagit specific adaptions to ti2c-web.
*/
'use strict';

def.attributes =
{
	// the ti2c-web instance
	_tw : { type : 'ti2c-web:Self' }
};

const doBundle = true;
//const doBundle = false;

const fs = require( 'fs/promises' );
const terser = require( 'terser' );
const { hashElement } = require( 'folder-hash' );

const Ajax = ti2c.require( 'Yagit/Server/Ajax' );
const Branches = ti2c.require( 'Yagit/Server/Branches' );
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
const Sha1 = ti2c.require( 'ti2c-web:Sha1' );
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
	async function( adir )
{
	Log.log( 'yagit', '*', 'preparing ti2c-web' );

	let tw =
		Ti2cWeb.create(
			'log', console.log,
			'interceptRequest', interceptRequest,
			'requestCaching', true,
		);

	// caclulates the style sheet hash
	const baseStyle = adir.dir( 'media' ).dir( 'yagit' ).file( 'style.css' );
	let styleHash = await hashElement( baseStyle.asString, { } );
	styleHash = encodeURI( styleHash.hash );
	Log.log( 'yagit', '*', 'style hash: ' + styleHash );

	// calculates the pdfjs hash
	const aDirPdfjs = adir.dir( 'pdfjs' );
	let pdfJsHash = await hashElement( aDirPdfjs.asString, { } );
	pdfJsHash = encodeURI( pdfJsHash.hash );
	Log.log( 'yagit', '*', 'pdfjs hash: ' + pdfJsHash );

	// calculates the prism hash
	const basePrism = adir.dir( 'dist' ).dir( 'prism' );
	let prismHash = await hashElement( basePrism.asString, { } );
	prismHash = encodeURI( prismHash.hash );
	Log.log( 'yagit', '*', 'prism hash: ' + prismHash );

	let rt = ResourceTwig.Empty;
	rt = Self._addClientConfig( rt, pdfJsHash );
	tw = await tw.addTwig( rt, 'client' );

	const brt = Ti2cWeb.ti2cBaseResources;
	for( let key of brt.keys )
	{
		rt = rt.create( 'twig:add', key, brt.get( key ) );
	}
	tw = await tw.addTwig( brt, 'client' );

	tw = await Self._addRoster( tw, adir, styleHash, pdfJsHash, prismHash );

	// prepares resources for the client
	const srt = await tw.getResourcesByTi2cWalk( 'gitengine:Yagit/Client/Root.js' );
	tw = await tw.addTwig( srt, 'client' );
	for( let key of srt.keys )
	{
		rt = rt.create( 'twig:add', key, srt.get( key ) );
	}

	tw = tw.updateTi2cCatalog( );

	if( doBundle )
	{
		const bundle = await Self._buildBundle( tw, rt );
		const hash = Sha1.calc( bundle.code );
		const sourceMapName = 'source-' + hash + '.map';
		const bundleName = 'client-' + hash + '.js';

		tw = await tw.addResources(
			bundleName, undefined,
			ResourceMemory.JsDataLongSourceMapName( bundle.code, sourceMapName ),

			sourceMapName, undefined,
			ResourceMemory.JsDataLong( bundle.map ),
		);

		Log.log( 'yagit', '*', 'bundle:', bundleName );
		tw = await Self._transduce( tw, rt, bundleName, styleHash, prismHash );
		const bRes = tw.get( bundleName );
		const gzip = await bRes.gzip( );
		Log.log( 'yagit', '*', 'uncompressed bundle size is', bRes.data.length );
		Log.log( 'yagit', '*', '  compressed bundle size is', gzip.length );
	}
	else
	{
		tw = await Self._transduce( tw, rt, undefined, styleHash, prismHash );
	}

	return Self.create( '_tw', tw );
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
| The client config as resource.
*/
def.static._addClientConfig =
	function( rt, pdfJsHash )
{
	return(
		rt.create(
			'twig:add', 'client--config.js',
			ResourceMemory.JsData(
				'var CHECK = true;\n'
				+ 'var NODE = false;\n'
				+ 'var PDF_JS_HASH = "' + pdfJsHash + '";\n'
			)
		)
	);
};

/*
| Adds the basic roster to a ti2c-web.
*/
def.static._addRoster =
	async function( tw, base, styleHash, pdfJsHash, prismHash )
{
	const aDirMediaYagit = base.d( 'media' ).d( 'yagit' ) ;
	const aDirPrism = base.d( 'dist' ).d( 'prism' ) ;

	tw = await tw.addResources(
		[ 'index.html', 'devel.html', '' ], undefined,
		//ResourceFile.AFileShortSameOrigin( aDirMediaYagit.f( 'index.html' ) ),
		ResourceFile.AFileShort( aDirMediaYagit.f( 'index.html' ) ),

		styleHash + '-style.css', undefined,
		ResourceFile.AFileLong( aDirMediaYagit.f( 'style.css' ) ),

		prismHash + '-prism.css', undefined,
		ResourceFile.AFileLong( aDirPrism.f( 'prism.css' ) ),

		prismHash + '-prism-dev.css', undefined,
		ResourceFile.AFileLong( aDirPrism.f( 'prism-dev.css' ) ),

		prismHash + '-prism.js', undefined,
		ResourceFile.AFileLong( aDirPrism.f( 'prism.js' ) ),

		prismHash + '-prism-dev.js', undefined,
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

			tw = await tw.addResources(
				'pdfjs-' + pdfJsHash + '/' + subDirName + '/' + filename, undefined,
				ResourceFile.AFileLong( subDir.f ( filename ) ),
			);
		}
	}

	return tw;
};

/*
| Builds the client bundle for quick loading.
*/
def.static._buildBundle =
	async function( tw, rt )
{
	Log.log( 'yagit', '*', 'building bundle' );

	const code = { };
	for( let key of rt.keys )
	{
		if( key === 'global-client.js' ) continue;
		const res = tw.get( key );
		const tcName = res.tcName;
		if( tcName )
		{
			code[ tcName ] = tw.get( tcName ).data + '';
		}
		code[ key ] = res.data + '';
	}

	const globals =
	{
		CHECK: true,
		NODE: false,
	};

	const options =
	{
		compress: { ecma: 6, global_defs: globals, },
		output: { beautify: false, },
		sourceMap: { filename: 'source.map' },
	};

	const result = await terser.minify( code, options );
	await fs.writeFile( 'report/source.map', result.map );

	if( result.error ) throw new Error( 'minify error: ' + result.error );
	return result;
};

/*
| PostProcessor.
*/
def.static._transduce =
	function( tw, rt, bundleName, styleHash, prismHash )
{
	const prism =
	[
		'<link rel="stylesheet" href="' + prismHash + '-prism.css" type="text/css"/>',
		'<script type="text/javascript" src="' + prismHash + '-prism.js"></script>'
	];

	const style =
		'<link rel="stylesheet" href="' + styleHash + '-style.css" type="text/css"/>\n';

	{
		let res = tw.get( 'devel.html' );
		let data = res.data + '';
		data = data.replace( /<!--STYLE.*>/, style );
		const scripts = [ ];
		for( let key of rt.keys )
		{
			const res = tw.get( key );
			const tcName = res.tcName;
			if( tcName )
			{
				scripts.push(
					'<script src="' + tcName + '" type="text/javascript" defer></script>'
				);
			}
			scripts.push(
				'<script src="' + key + '" type="text/javascript" defer></script>'
			);
		}

		data = data.replace( /<!--SCRIPTS.*>/, scripts.join( '\n' ) );
		data = data.replace( /<!--PRISM.*>/, prism.join( '\n' ) );

		res = res.create( 'data', data );
		tw = tw.setResource( 'devel.html', res );
	}

	if( bundleName )
	{
		let res = tw.get( 'index.html' );
		let data = res.data + '';
		data = data.replace( /<!--STYLE.*>/, style );
		data =
			data.replace(
				/<!--SCRIPTS.*>/,
				'<script src="' + bundleName + '" type="text/javascript"></script>'
			);
		data = data.replace( /<!--PRISM.*>/, prism.join( '\n' ) );

		res = res.create( 'data', data );
		tw = tw.setResource( '', res ).setResource( 'index.html', res );
	}

	return tw;
};
