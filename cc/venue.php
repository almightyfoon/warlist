<?php
header('Access-Control-Allow-Origin: *');  

set_include_path(get_include_path() . PATH_SEPARATOR . '/home/conflic1/public_html/vendor/google/apiclient/src');
require_once '/home/conflic1/public_html/vendor/autoload.php';
require_once 'authinc.php';

//session_start();

function startsWith($haystack, $needle)
{
     $length = strlen($needle);
     return (substr($haystack, 0, $length) === $needle);
}



$mysqli = getDB();


//$tourn = $_POST['tourn'];

//$td = json_decode($tourn);
$d = array();
$vd = array();

//$v = strtolower($td->venue);
//$v = "https://www.facebook.com/Pegasus-Games-50164954847/";
$v = "https://www.facebook.com/atcwmh/";

echo $_GET['v'];
echo "<hr>";

$fbid = strtolower($_GET['v']);

echo $fbid . '<br>';

if( $_GET['v'] )
{
    $v = "https://www.facebook.com/" . $_GET['v'] . '/';
    echo $v . "<hr>";
}


$q = 'SELECT COUNT(*) as count FROM venue WHERE fbid=\'' . $mysqli->escape_string($fbid) . "';";

echo $q . '<br>';
$countret = $mysqli->query($q);

$cr = $countret->fetch_assoc();

print_r($cr);
print_r($cr['count']);

if( $cr['count'] > 0 )
{
    echo 'Venue already exists in database.';
    exit();
}

$v2 = "";

if( startsWith($v, "https://www.facebook.com/") )
{
    $v2 = substr($v, 25);
} 
else if( startsWith($v, "http://www.facebook.com/") )
{
    $v2 = substr($v, 24);
}

echo $v2 . "\n";

if( $v2 != "" )
{
		try
		{
			$fb = new Facebook\Facebook([
				'app_id' => '1825213381039783',
				'default_graph_version' => 'v2.5'
			]);


            $loc1 = strrpos($v2, '-');

            if( $loc1 === FALSE )
            {
                try
                {
                    $response = $fb->get('/' . $v2 .  '?fields=id,name,cover,single_line_address,picture,link,location', '');

                    //echo $response->getBody();
                    $td['venuefull'] = json_decode($response->getBody());
                }
                catch(Exception $e)
                {
                    echo 'Exception getting response from Facebook';
                    exit();
                }
            }
            else
            {
                try
                {
                    $v3 = substr($v2, $loc1+1);
                    $response = $fb->get('/' . $v3 .  '?fields=id,name,cover,single_line_address,picture,link,location', '');
                    $td['venuefull'] = json_decode($response->getBody());
                }
                catch(Exception $e)
                {

                    try
                    {
                        $response = $fb->get('/' . $v2 .  '?fields=id,name,cover,single_line_address,picture,link,location', '');
                        $td['venuefull'] = json_decode($response->getBody());
                    }
                    catch(Exception $e)
                    {
                        echo 'Exception (second chance) getting response from Facebook';
                        exit();
                    }
                }

            }



		}
		catch(Exception $e)
		{
			echo 'Exception getting FB object<br>';
			echo '<pre>';
			print_r($e);
			echo '</pre>';
			return -1;
		}
    
}

$td['venue2'] = $v2;

$vf = $td['venuefull'];

$vd['fbid'] = $fbid;
$vd['name'] = $vf->name;
$vd['cover'] = $vf->cover->source;
$vd['picture'] = $vf->picture->data->url;
$vd['address'] = $vf->single_line_address;
$vd['link'] = $vf->link;
$vd['city'] = $vf->location->city;
$vd['state'] = $vf->location->state;
$vd['country'] = $vf->location->country;
$vd['street'] = $vf->location->street;
$vd['zip'] = $vf->location->zip;
$vd['latitude'] = $vf->location->latitude;
$vd['longitude'] = $vf->location->longitude;

echo '<hr>';

print_r($vd);

echo '<hr>';

print_r($vf);

echo '<hr>';

$mq = $vd['name'] . ',' . $vd['address'] . ',' 
//    . $vd['street'] . ','
//    . $vd['city'] . ',' . $vd['state'] . ',' 
    . $vd['country'];

echo $mq . '<br>';
echo urlencode($mq) . '<br>';

echo '<iframe
  width="600"
  height="450"
  frameborder="0" style="border: 1px solid black;"
  src="https://www.google.com/maps/embed/v1/place?key=key&q=' . urlencode($mq) . '" allowfullscreen>
</iframe>';

echo '<hr>';

// writing stuff



// $je = json_encode($td);

// echo $je;


// echo 'encoded';



// $jeq = mysqli_real_escape_string($mysqli, $je);

// print_r($jeq);


echo '<hr>';

$q = "INSERT INTO venue(name, link, picture, cover, address, city, state, street, zip, country, latitude, longitude, fbid) "
        . "VALUES("
        . "'" . $mysqli->escape_string($vd['name']) . "',"
        . "'" . $mysqli->escape_string($vd['link']) . "',"
        . "'" . $mysqli->escape_string($vd['picture']) . "',"
        . "'" . $mysqli->escape_string($vd['cover']) . "',"
        . "'" . $mysqli->escape_string($vd['address']) . "',"
        . "'" . $mysqli->escape_string($vd['city']) . "',"
        . "'" . $mysqli->escape_string($vd['state']) . "',"
        . "'" . $mysqli->escape_string($vd['street']) . "',"
        . "'" . $mysqli->escape_string($vd['zip']) . "',"
        . "'" . $mysqli->escape_string($vd['country']) . "',"
        . ($vd['latitude'] ? $mysqli->escape_string($vd['latitude']) : 'null') . ","
        . ($vd['longitude'] ? $mysqli->escape_string($vd['longitude']) : 'null')  . ","
        . "'" . $mysqli->escape_string($fbid) . "');";
    ;

echo '<hr>';
echo $q;
echo '<hr>';

$mysqli->query($q);

echo '<hr>';


// $q = 'INSERT INTO tournaments(startdate, jsondata, approved) VALUES(\''
//     . mysqli_real_escape_string($mysqli, $td->date) . '\', \''
//     . $jeq . '\', 0);';

// echo $q;

// $mysqli->query($q);



?>
