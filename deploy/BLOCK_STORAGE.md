# OCI Block Storage Mounting Guide

This guide ensures persistent storage for user uploads and database files on VM1.

### 1. Identify the device
Attach the volume in OCI Console, then run:
```bash
lsblk
```
Identify the new device (usually `/dev/sdb` or `/dev/oraclevb...`).

### 2. Format the volume
```bash
sudo mkfs.ext4 /dev/sdb
```

### 3. Create mount point
```bash
sudo mkdir -p /data
```

### 4. Get UUID
```bash
sudo blkid /dev/sdb
```
Copy the `UUID="xxx"`.

### 5. Persistent Mount (fstab)
Add to `/etc/fstab`:
```text
UUID=your-uuid-here /data ext4 defaults,noatime,_netdev 0 2
```

### 6. Mount all
```bash
sudo mount -a
sudo chown -R $USER:$USER /data
sudo chmod 700 /data
```