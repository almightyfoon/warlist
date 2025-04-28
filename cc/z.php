<?php session_start(); ?>

<!DOCTYPE html>
<html>
<body>
<head>
<title>Test pt 2</title>
</head>

<?php


echo 'Testing';

if( $_SERVER['REMOTE_ADDR'] == '24.196.146.229'
 || $_SERVER['REMOTE_ADDR'] == '128.105.136.11' )
{
    $mysqli = new mysqli("kawalsky.asoshared.com", "conflic1_user", "", "conflic1_main");
    $result = $mysqli->query("SELECT email, name, pic, description, listdata FROM google_login, saved_lists WHERE google_login.uid = saved_lists.uid ORDER BY google_login.uid, saved_lists.offset;");

    echo '<table>';

    while( $result && $row = $result->fetch_assoc() )
    {
        echo '<tr>';

        echo '<td>' . $row['email'] . '</td>';
        echo '<td>';
        if( $row['pic'] )
        {
            echo '<img src="' . $row['pic'] . '" />';
        }
        echo '</td>';

        echo '<td>' . $row['name'] . '</td>';

        echo '<td>' . $row['description'] . '</td>';

        echo '<td>' . $row['listdata'] . '</td>';

        echo '<td><a target="_blank" href="CC_URL/#a' . urlencode($row['listdata']) . '">link</a></td>';


        echo '</tr>';

    }

    echo '</table>';

}
else 
{
}

?>

</body>
</html>
