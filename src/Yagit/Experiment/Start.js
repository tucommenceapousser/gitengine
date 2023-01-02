const nodegit = require( 'nodegit' );

async function run( )
{
	const repoPath = '/home/axel/git/SFB/.git';
	const ngRepo = await nodegit.Repository.open( repoPath );
	const ngHead = await ngRepo.getBranchCommit( 'refs/heads/master' );

	const revWalk = ngRepo.createRevWalk( );
	revWalk.sorting( nodegit.Revwalk.SORT.TIME );
	revWalk.push( ngHead.id( ) );
	//await revWalk.fastWalk( 30 );
	const commits = await revWalk.getCommits( 50 );

	let n = 0;
	for( let commit of commits )
	{
		for( let key in commit ) console.log( 'KK', key );
		const ngSignature = commit.author( );
		const authorName = ngSignature.name( );
		const date = commit.date( ).getTime( );
		const message = commit.message( );

		console.log( authorName, date, message );

		const ngDiff = ( await commit.getDiff( ) )[ 0 ];

		await ngDiff.findSimilar( {
			flags: nodegit.Diff.FIND.RENAMES
		} );

		//console.log( ngDiff );
		//for( let key in ngDiff ) console.log( key );

		const ngPatches = await ngDiff.patches( );

		for( let patch of ngPatches )
		{
			console.log( '-----PATCH------' );
			//for( let key in patch )
			//{
			//	console.log( key, patch[ key ]( ) );
			//}
			//console.log( patch.lineStats( ) );
			{
				const ngNewFile = patch.newFile( );
				const ngOldFile = patch.oldFile( );
				console.log( 'new', ngNewFile.path( ) );
				console.log( 'old', ngOldFile.path( ) );
			}
			const hunks = await patch.hunks( );
			let ha = -1;
			for( let hunk of hunks )
			{
				ha++;
				console.log( '-----HUNK '+ ha +'----' );

				//const oldLines = hunk.oldLines( );
				//const newLines = hunk.newLines( );
				//const oldStart = hunk.oldStart( );
				//const newStart = hunk.newStart( );
				//console.log( oldLines );
				//console.log( newLines );
				//console.log( oldStart );
				//console.log( newStart );

				const lines = await hunk.lines( );
				for( let line of lines )
				{
					//console.log( line.content( ) );
					console.log( );
					for( let key in line )
					{
						console.log( key + ': ' + line[ key ]( ) );
					}
					//console.log( );
					//console.log( line );
				}
				//console.log( ',' );
			}
		}
		console.log( '==================' );
		//console.log( ngPatches );
		if( ++n === 1 ) break;
	}
}

run( );
//firstCommitOnMaster.history(nodegit.Revwalk.SORT.TIME);
