<?php
header('Access-Control-Allow-Origin: *');  

//set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
//require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';

//session_start();

$mysqli = getDB();

$code = $mysqli->escape_string($_POST['code']);

// $q = 'SELECT * FROM atc WHERE regcode=\'' . $code . '\';';

// $results = $mysqli->query($q);

// $ret = '';

// while( $r = $results->fetch_assoc() )
// {
// 	$ret = $r['jsondata'];
// }

//print $ret;

$q = "SELECT uid, team_name FROM atc WHERE regcode='$code';";

$result = $mysqli->query($q);
$ret = '';

if($result && $row = $result->fetch_assoc() )
{
	$teamid = $row['uid'];
	$teamname = $row['team_name'];

	$q2 = "SELECT * FROM players WHERE event_uid=10 AND team_index=$teamid ORDER BY player_index;";

	$res2 = $mysqli->query($q2);

	$players = array();

	while( $res2 && $r2 = $res2->fetch_assoc() )
	{
		$list = $r2['list'];
		$pname = $r2['name'];

		$player = array();
		$player['name'] = $pname;
		
		if( $list != "" && $list != null )
		{
			$player['list'] = $list;
		}

		array_push($players, $player);
	}

	$team = array();
	$team['name'] = $teamname;
	$team['players'] = $players;

	//array_push($ret, json_encode($team));

	$ret = json_encode($team);
}

//echo json_encode($ret);
echo $ret;




?>

