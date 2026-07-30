import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
import re

file1 = r'c:\repository\fcr-scs\presentation_layer\src\pages\SmartContract\BlockchainDashboard.tsx'
content1 = open(file1, 'r', encoding='utf-8').read()
content1 = content1.replace("import { blockchainApi } from '../../services/blockchainApi';", "import { blockchainApi } from '../../services/blockchainApi';\nimport { useWallet } from '../../hooks/useWallet';")
content1 = re.sub(
    r'const \[walletConnected, setWalletConnected\] = React\.useState\(false\);\s*const \[walletAddress, setWalletAddress\] = React\.useState\(\'\'\);\s*',
    'const { walletConnected, walletAddress, error: walletError, setError: setWalletError, connectWallet: handleConnectWallet } = useWallet();\n  ',
    content1
)
content1 = re.sub(
    r'const handleConnectWallet = async \(\) => \{.*?\};\s*(?=const publishedCount)',
    '',
    content1,
    flags=re.DOTALL
)
content1 = content1.replace('{error && <p className="text-red-500 my-4">{error}</p>}', '{error && <p className="text-red-500 my-4">{error}</p>}\n      {walletError && <p className="text-red-500 my-4">{walletError}</p>}')
content1 = content1.replace('className="font-semibold gap-2', 'className="font-semibold flex items-center justify-center gap-2')
open(file1, 'w', encoding='utf-8').write(content1)
print('BlockchainDashboard patched')

file2 = r'c:\repository\fcr-scs\presentation_layer\src\pages\SmartContract\PublishLedger.tsx'
content2 = open(file2, 'r', encoding='utf-8').read()
content2 = content2.replace("import { blockchainApi } from '../../services/blockchainApi';", "import { blockchainApi } from '../../services/blockchainApi';\nimport { useWallet } from '../../hooks/useWallet';")
content2 = re.sub(
    r'const \[walletAddress, setWalletAddress\] = useState\(\'\'\);\s*',
    'const { walletAddress, walletConnected, error: walletError, setError: setWalletError, connectWallet } = useWallet();\n  ',
    content2
)
content2 = re.sub(
    r'const connectWallet = async \(\) => \{.*?\};\s*(?=const handlePublishClick)',
    '',
    content2,
    flags=re.DOTALL
)
content2 = content2.replace('{error && <p className="text-red-500 font-medium my-2">{error}</p>}', '{error && <p className="text-red-500 font-medium my-2">{error}</p>}\n        {walletError && <p className="text-red-500 font-medium my-2">{walletError}</p>}')
content2 = content2.replace('className="flex items-center gap-2 px-5 py-2.5 bg-md-primary', 'className="flex items-center justify-center gap-2 px-5 py-2.5 bg-md-primary')
open(file2, 'w', encoding='utf-8').write(content2)
print('PublishLedger patched')

file3 = r'c:\repository\fcr-scs\presentation_layer\src\pages\SmartContract\VoidLedger.tsx'
content3 = open(file3, 'r', encoding='utf-8').read()
content3 = content3.replace("import { blockchainApi } from '../../services/blockchainApi';", "import { blockchainApi } from '../../services/blockchainApi';\nimport { useWallet } from '../../hooks/useWallet';")
content3 = re.sub(
    r'const \[walletAddress, setWalletAddress\] = useState\(\'\'\);\s*',
    'const { walletAddress, walletConnected, error: walletError, setError: setWalletError, connectWallet } = useWallet();\n  ',
    content3
)
content3 = re.sub(
    r'const connectWallet = async \(\) => \{.*?\};\s*(?=const handleVoidClick)',
    '',
    content3,
    flags=re.DOTALL
)
content3 = content3.replace('{error && <p className="text-red-500 font-medium my-2">{error}</p>}', '{error && <p className="text-red-500 font-medium my-2">{error}</p>}\n          {walletError && <p className="text-red-500 font-medium my-2">{walletError}</p>}')
content3 = content3.replace('className="flex items-center gap-1.5 px-4 py-2 bg-md-primary', 'className="flex items-center justify-center gap-1.5 px-4 py-2 bg-md-primary')
open(file3, 'w', encoding='utf-8').write(content3)
print('VoidLedger patched')
