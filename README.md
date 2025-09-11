PARA CONECTAR localhost:3000/mcp

token: x-api-key='APIKEY'


documentacion de el schema de coneccion del json https://gemini-cli.xyz/docs/en/tools/mcp-server#discovery-process-deep-dive

ejemplo json :
{
    "mcpServers": {
        "oberonSHTTP": {
            "httpUrl": "http://localhost:3000/mcp",
            "headers": {
                "x-api-key": "YOUR_API_KEY"
            }
        }
    }
}