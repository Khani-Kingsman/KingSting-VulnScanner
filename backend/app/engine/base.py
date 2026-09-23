from abc import ABC, abstractmethod
from typing import List, Tuple
from app.models.scan import ScanDepth, TargetDevice, CheckStep
from app.models.findings import Finding

class BaseScanner(ABC):
    @abstractmethod
    def get_steps_for_depth(self, depth: ScanDepth) -> List[CheckStep]:
        """Returns the list of check steps for the chosen scan depth."""
        pass

    @abstractmethod
    def execute_step(self, step: CheckStep, target: TargetDevice, depth: ScanDepth) -> Tuple[CheckStep, List[Finding]]:
        """Simulates/executes a single step and returns updated step and discovered findings."""
        pass
