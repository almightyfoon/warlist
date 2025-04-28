<?php

header('Access-Control-Allow-Origin: *');  

set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';

$mysqli = getDB();

//$uid = getUid($mysqli, $_POST['type'], $_POST['id']);

//if( $uid > 0 )
{
	// $qauth = "SELECT atc_staff FROM google_login WHERE uid=$uid;";

	// $rauth = $mysqli->query($qauth);

	// $auth = 0;

	// if( $rauth && $rowa = $rauth->fetch_assoc() )
	// {
	// 	$auth = $rowa['atc_staff'];
	// }

	// if( $auth == 1 )
	{
		// $q = "SELECT jsondata FROM atc ORDER BY team_name;";

		// $result = $mysqli->query($q);

		// $ret = array();

		// while( $result && $row = $result->fetch_assoc() )
		// {
		// 	array_push($ret, $row['jsondata']);
		// }

		// echo json_encode($ret);

		$q = "SELECT uid, team_name FROM atc ORDER BY team_name;";

		$result = $mysqli->query($q);

		$ret = array();

		while($result && $row = $result->fetch_assoc() )
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

			array_push($ret, json_encode($team));
		}

		echo json_encode($ret);
		
	}
	// else
	// {
	// 	echo 'UNAUTHORIZED';
	// }
}

?>

