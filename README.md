# Minecraft Dungeons Mod Creation Tool
long name, I know

This allows for the easy creation of .pak mods for minecraft dungeons.

### Dependencies
1. Currently must be using windows
2. Deno
    * You can download Deno [here](https://deno.land/)
3. Unreal Engine 4.22
    * Install Unreal Engine (UE) from the [Epic Games launcher](https://www.unrealengine.com/en-US/)

### Setup
1. Edit `exampleConfig.json` to include the path to your UE install and rename it to `config.json`  
   * Example path would be `C:/Program Files/Epic/UE_4.22`
2. Put your asset files in `source/`
3. Edit `exampleAssets.json` to include the information for each asset and rename it to `assets.json`
4. Run `deno run --allow-write --allow-read --allow-run ./modmaker.ts` to run the program
5. ???
6. profit
   
### Asset Data
Asset data is stored in an assets array in `assets.json`
The format for each asset is
```json
{
    "name": "file name in source/",
    "destination": "where the asset goes in the game files"
}
```
Destination can be found by using a tool such as [umodel](https://www.gildor.org/en/projects/umodel) to look into the game's pak files and get the file name and path

An example asset would be:
```json
{
    "name": "T_Steve_Skin.png",
    "destination": "/Dungeons/Content/Actors/Characters/Player/Master/Skins/Steve/T_Steve_Skin"
}
```
Currently asset names have to be the same as the names in the destination.


### Todo list
- [ ] Add support for chosing what modules to run instead of just running create mod
- [ ] Add support for assets with different names than the destination
- [ ] Fix up cooking and asset importing to make them os independent
- [ ] Implement better error messages for checking assets.json
- [ ] Implement error messages when using UE programs
- [ ] Fix any bugs that pop up


I'll be trying to work on any issues that come in but feel free to make a pull request and I'll look it over.
