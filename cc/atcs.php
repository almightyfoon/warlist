<?php
header('Access-Control-Allow-Origin: *');  

//set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
//require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';

//session_start();

$mysqli = getDB();

$code = $mysqli->escape_string($_POST['code']);
$data = $mysqli->escape_string($_POST['data']);

$index = null;
$list = null;

if( $_POST['index'] )
{
	$index = $mysqli->escape_string($_POST['index']);
	$list = $mysqli->escape_string($_POST['list']);

	$q = "SELECT uid FROM atc WHERE regcode='$code';";

	$result = $mysqli->query($q);

	if( $result && $row = $result->fetch_assoc() )
	{
		$teamid = $row['uid'];

		$q2 = "UPDATE players SET list='$list' WHERE event_uid=10 AND team_index=$teamid AND player_index=$index;";
		$mysqli->query($q2);

		echo "Updated list for team $teamid player $index.";
	}
	else
	{
		echo "Unable to find team";
	}

}
else
{
	$q = 'UPDATE atc SET jsondata=\'' . $data . '\' WHERE regcode=\'' . $code . '\';';

	$mysqli->query($q);

	$q2 = "SELECT uid FROM atc WHERE regcode='$code';";

	$result = $mysqli->query($q2);

	if( $result && $row = $result->fetch_assoc() )
	{
		$teamid = $row['uid'];
		$text = $_POST['data'];

		$jd = json_decode($text, true);

		$name = $jd["name"];

		//echo $name;

		$players = $jd["players"];

		//var_dump($players);

		for( $i = 0; $i < count($players); $i++ )
		{
			$pname = $mysqli->real_escape_string($players[$i]["name"]);
			$plist = $mysqli->real_escape_string($players[$i]["list"]);

			$q3 = "INSERT INTO players(event_uid, team_index, player_index, name, list) VALUES(10, $teamid, $i, '$pname', '$plist') ON DUPLICATE KEY UPDATE list='$plist';";
			$mysqli->query($q3);

			//echo $q3;
		}
	}

	echo "Updated team.";
}



?>

