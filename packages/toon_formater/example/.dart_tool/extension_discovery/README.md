Extension Discovery Cache
=========================

This folder is used by `package:extension_discovery` to cache lists of
packages that contains extensions for other packages.

DO NOT USE THIS FOLDER
----------------------

 * Do not read (or rely) the contents of this folder.
 * Do write to this folder.

If you're interested in the lists of extensions stored in this folder use the
API offered by package `extension_discovery` to get this information.

If this package doesn't work for your use-case, then don't try to read the
contents of this folder. It may change, and will not remain stable.

Use package `extension_discovery`
---------------------------------

If you want to access information from this folder.

Feel free to delete this folder
-------------------------------

Files in this folder act as a cache, and the cache is discarded if the files
are older than the modification time of `.dart_tool/package_config.json`.

Hence, it should never be necessary to clear this cache manually, if you find a
need to do please file a bug.
