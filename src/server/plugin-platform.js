const pluginFactory = function(AbstractPlugin) {
  return class PluginPlatform extends AbstractPlugin {}
}

export default pluginFactory;
