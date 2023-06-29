export default function(Plugin) {
  // The server-side does nothing special, it is here for consistency and
  // to prepare eventual future features

  /**
   * Client-side representation of the soundworks' platform init plugin.
   */
  class PluginPlatformInitServer extends Plugin {};

  return PluginPlatformInitServer;
}
