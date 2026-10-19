import os
from dataclasses import dataclass

@dataclass
class Config:
    BLUR_LAPLACIAN_THRESHOLD: float = float(os.getenv('BLUR_THRESHOLD', '55.0'))
    MIN_CONTOUR_AREA: int = int(os.getenv('MIN_CONTOUR_AREA', '120'))
    DIFF_THRESHOLD: int = int(os.getenv('DIFF_THRESHOLD', '38'))
    VERIFICATION_TOLERANCE: float = float(os.getenv('VERIFICATION_TOLERANCE', '26.0'))
    MAX_RECAPTURE_RETRIES: int = int(os.getenv('MAX_RECAPTURE_RETRIES', '3'))
    AWS_REGION: str = os.getenv('AWS_REGION', 'us-east-1')
    S3_BUCKET: str = os.getenv('S3_BUCKET', 'scenepilot-ai-evidence-vault')
    CLOUDWATCH_LOG_GROUP: str = os.getenv('CLOUDWATCH_LOG_GROUP', '/aws/scenepilot-vision-agent')
    LOCAL_ONLY_MODE: bool = os.getenv('LOCAL_ONLY_MODE', 'true').lower() == 'true'
