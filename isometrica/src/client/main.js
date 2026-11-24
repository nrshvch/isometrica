import namespace from "namespace";
import Vkaria from "./vkaria";
import Host from "./host";

var Client = namespace("Isometrica.Client");

Client.Vkaria = Vkaria;
//where the world runs: in the page, or on a worker (client/host)
Client.Host = Host;

export default Client;
