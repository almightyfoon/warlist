
//namespace ccapi {

    export function ajax(url: string, callback: (resp: string) => void): void {
        let xhttp = new XMLHttpRequest();

        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                callback(xhttp.responseText);
            }
        };

        xhttp.open("GET", url, true);
        xhttp.send();
    }


//}