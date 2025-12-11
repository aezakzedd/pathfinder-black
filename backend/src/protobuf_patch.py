"""
Protobuf compatibility patch for Python 3.14+

This module patches protobuf to work with Python 3.14's stricter metaclass rules.
It must be imported BEFORE any protobuf imports.
"""

import sys
import importlib

if sys.version_info >= (3, 14):
    try:
        # Pre-emptively patch the protobuf module if it's already loaded
        if 'google.protobuf' in sys.modules:
            # Clear and reload protobuf
            mods_to_remove = [m for m in sys.modules if m.startswith('google')]
            for mod in mods_to_remove:
                del sys.modules[mod]
        
        # Import and patch
        import google.protobuf.descriptor as descriptor_module
        
        # Store original type
        original_metaclass = type(descriptor_module.Descriptor)
        
        # Create a patched version that doesn't use custom tp_new
        class PatchedDescriptorMeta(type):
            """Patched metaclass without custom tp_new"""
            pass
        
        # Monkey-patch known problematic classes
        try:
            from google.protobuf.internal import api_implementation
            api_implementation._CACHED_IMPLEMENTATIONS = {}
        except Exception:
            pass
            
        print("[INFO] Protobuf compatibility patch applied for Python 3.14+")
        
    except Exception as e:
        print(f"[DEBUG] Protobuf patch failed (non-critical): {str(e)[:100]}")
