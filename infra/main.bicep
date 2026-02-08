// Parameters allow you to reuse this for different "clients" later
param location string = 'eastus2'
param appName string = 'engine01-core'

resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: appName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    // This tells Azure where your code lives in the repo
    buildProperties: {
      appLocation: 'src'
      apiLocation: 'api'
      outputLocation: '' // Since we aren't using a framework like React, leave this empty
    }
  }
}

output deploymentUrl string = staticWebApp.properties.defaultHostname
