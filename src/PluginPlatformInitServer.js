export default function(Plugin) {
  // server-side does nothing special,
  // here for consistency and prepare eventual future features
  class PluginPlatformInitServer extends Plugin {};

  return PluginPlatformInitServer;
}
