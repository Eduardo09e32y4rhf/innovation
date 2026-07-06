file_path = 'apps/web/app/dashboard/layout.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import_str = "import { PrivacyConsentGate } from './_components/privacy-consent-gate';\nimport { PendingNotificationsGate } from './_components/pending-notifications-gate';"
content = content.replace("import { PrivacyConsentGate } from './_components/privacy-consent-gate';", import_str)

wrap_str = "<PrivacyConsentGate>\n            <PendingNotificationsGate>\n              <div className=\"min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-7\">\n                {children}\n              </div>\n            </PendingNotificationsGate>\n            </PrivacyConsentGate>"
content = content.replace("<PrivacyConsentGate>\n              <div className=\"min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-7\">\n                {children}\n              </div>\n            </PrivacyConsentGate>", wrap_str)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Layout patched')
