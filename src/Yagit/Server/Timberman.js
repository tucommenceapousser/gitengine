/*
| Handles yagit specific adaptions to timberman.
*/
'use strict';

def.attributes =
{
	// the general timberman instance
	_tm : { type : 'timberman:Timberman' }
};

const doBundle = true;
//const doBundle = false;

const fs = require( 'fs/promises' );
const terser = require( 'terser' );
const { hashElement } = require( 'folder-hash' );

const Ajax = tim.require( 'Yagit/Server/Ajax' );
const Branches = tim.require( 'Yagit/Server/Branches' );
const Diffs = tim.require( 'Yagit/Server/Diffs' );
const Dir = tim.require( 'Yagit/Server/Dir' );
const File = tim.require( 'Yagit/Server/File' );
const History = tim.require( 'Yagit/Server/History' );
const Listing = tim.require( 'Yagit/Server/Listing' );
const Log = tim.require( 'Log/Self' );
const Path = tim.require( 'Yagit/Path/Self' );
const Sha1 = tim.require( 'timberman:Sha1' );
const Timberman = tim.require( 'timberman:Timberman' );

tim.require( 'Yagit/Client/Root.js' );

/*
| Intercepts file requests to handle without timberman.
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
| Prepares timberman.
|
| ~absolute dir of root directory.
*/
def.static.prepare =
	async function( adir )
{
	Log.log( 'yagit', '*', 'preparing timberman' );

	let tm =
		Timberman.create(
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
	const basePdfjs = adir.dir( 'pdfjs' );
	let pdfJsHash = await hashElement( basePdfjs.asString, { } );
	pdfJsHash = encodeURI( pdfJsHash.hash );
	Log.log( 'yagit', '*', 'pdfjs hash: ' + pdfJsHash );

	// calculates the prism hash
	const basePrism = adir.dir( 'dist' ).dir( 'prism' );
	let prismHash = await hashElement( basePrism.asString, { } );
	prismHash = encodeURI( prismHash.hash );
	Log.log( 'yagit', '*', 'prism hash: ' + prismHash );

	tm = await Self._addClientConfig( tm, pdfJsHash );
	tm = await tm.addTi2cBaseResources( 'client' );
	tm = await Self._addRoster( tm, adir, styleHash, pdfJsHash, prismHash );
	tm = await tm.addCopse( 'gitengine:Yagit/Client/Root.js', 'client' );
	tm = await tm.updateTi2cCatalog( tm );

	if( doBundle )
	{
		const bundle = await Self._buildBundle( tm );
		const hash = Sha1.calc( bundle.code );
		const sourceMapName = 'source-' + hash + '.map';
		const bundleName = 'client-' + hash + '.js';
		tm = await tm.addResource(
			adir,
			{
				name: bundleName,
				age: 'long',
				data: bundle.code,
				map: sourceMapName,
			}
		);
		tm = await tm.addResource(
			adir,
			{
				name: sourceMapName,
				age: 'long',
				data: bundle.map
			}
		);
		Log.log( 'yagit', '*', 'bundle:', bundleName );
		tm = await Self._transduce( tm, bundleName, styleHash, prismHash );
		const bRes = tm.get( bundleName );
		const gzip = await bRes.gzip( );
		Log.log( 'yagit', '*', 'uncompressed bundle size is', bRes.data.length );
		Log.log( 'yagit', '*', '  compressed bundle size is', gzip.length );
	}
	else
	{
		tm = await Self._transduce( tm, undefined, styleHash, prismHash );
	}

	return Self.create( '_tm', tm );
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
	this._tm.requestListener( req, res );
};

/*
| The client config as resource.
*/
def.static._addClientConfig =
	async function( timberman, pdfJsHash )
{
	return( await timberman.addResource(
		undefined,
		{
			name : 'config.js',
			list : 'client',
			data :
				'var CHECK = true;\n'
				+ 'var NODE = false;\n'
				+ 'var PDF_JS_HASH = "' + pdfJsHash + '";\n'
		}
	) );
};

/*
| Adds the basic roster to a timberman.
*/
def.static._addRoster =
	async function( timberman, base, styleHash, pdfJsHash, prismHash )
{
	timberman = await timberman.addResource(
		base,
		{
			file: './media/yagit/index.html',
			name: [ 'index.html', '' ],
		},
		{
			// needs to separate resource since transduced differently
			file: './media/yagit/index.html',
			name: 'devel.html',
		},
		{
			age: 'long',
			file: './media/yagit/style.css',
			name: styleHash + '-style.css',
		},
		{
			age: 'long',
			file: './dist/prism/prism.css',
			name: prismHash + '-prism.css',
		},
		{
			age: 'long',
			file: './dist/prism/prism-dev.css',
			name: prismHash + '-prism-dev.css',
		},
		{
			age: 'long',
			file: './dist/prism/prism.js',
			name: prismHash + '-prism.js',
		},
		{
			age: 'long',
			file: './dist/prism/prism-dev.js',
			name: prismHash + '-prism-dev.js',
		},
	);

	// adds pdfjs
	const basePdfjs = base.dir( 'pdfjs' );
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

		subDir = basePdfjs;
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

			timberman = await timberman.addResource(
				base,
				{
					age: 'long',
					name: 'pdfjs-' + pdfJsHash + '/' + subDirName + '/' + filename,
					file: './pdfjs/' + subDirName + '/' + filename,
				}
			);
		}
	}

	return timberman;
};

/*
| Builds the client bundle for quick loading.
*/
def.static._buildBundle =
	async function( timberman )
{
	Log.log( 'yagit', '*', 'building bundle' );
	const code = { };
	for( let name of timberman.getList( 'client' ) )
	{
		if( name === 'global-client.js' ) continue;
		const res = timberman.get( name );
		code[ name ] = res.data + '';
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
	function( timberman, bundleName, styleHash, prismHash )
{
	const prism =
	[
		'<link rel="stylesheet" href="' + prismHash + '-prism.css" type="text/css"/>',
		'<script type="text/javascript" src="' + prismHash + '-prism.js"></script>'
	];

	const style =
		'<link rel="stylesheet" href="' + styleHash + '-style.css" type="text/css"/>\n';

	{
		const res = timberman.get( 'devel.html' );
		let data = res.data + '';
		data = data.replace( /<!--STYLE.*>/, style );
		const scripts = [ ];
		for( let name of timberman.getList( 'client' ) )
		{
			scripts.push( '<script src="' + name + '" type="text/javascript" defer></script>' );
		}
		data = data.replace( /<!--SCRIPTS.*>/, scripts.join( '\n' ) );
		data = data.replace( /<!--PRISM.*>/, prism.join( '\n' ) );

		timberman = timberman.updateResource( res.create( 'data', data ) );
	}

	if( bundleName )
	{
		const res = timberman.get( 'index.html' );
		let data = res.data + '';
		data = data.replace( /<!--STYLE.*>/, style );
		data =
			data.replace(
				/<!--SCRIPTS.*>/,
				'<script src="' + bundleName + '" type="text/javascript"></script>'
			);
		data = data.replace( /<!--PRISM.*>/, prism.join( '\n' ) );

		timberman = timberman.updateResource( res.create( 'data', data ) );
	}

	return timberman;
};
