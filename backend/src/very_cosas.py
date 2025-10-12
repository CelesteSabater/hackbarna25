from pprint import pprint
from vonage import Vonage, Auth, HttpClientOptions

# Create an Auth instance
auth = Auth(api_key="8ba155c7", api_secret="zPUPeN2MtbDRs27J")

# Create a Vonage instance
client = Vonage(auth=auth)

insight_json = client.number_insight.get_advanced_info_sync
pprint(insight_json)
