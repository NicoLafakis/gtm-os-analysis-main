// GTM OS Builder - Vendor Icon Component
import { SiApollographql } from 'react-icons/si';
import { HiOutlineSparkles, HiOutlineUserGroup, HiOutlineFire, HiOutlineSearch, HiOutlineDatabase } from 'react-icons/hi';
import { BiTargetLock } from 'react-icons/bi';

interface VendorIconProps {
  id: string;
  className?: string;
  style?: React.CSSProperties;
}

export const VendorIcon = ({ id, className = "w-6 h-6", style }: VendorIconProps) => {
  const iconProps = { className, style };
  switch (id) {
    case "clay":
      return <BiTargetLock {...iconProps} />;
    case "apollo":
      return <SiApollographql {...iconProps} />;
    case "zoominfo":
      return <HiOutlineSearch {...iconProps} />;
    case "usergems":
      return <HiOutlineSparkles {...iconProps} />;
    case "warmly":
      return <HiOutlineFire {...iconProps} />;
    case "commonroom":
      return <HiOutlineUserGroup {...iconProps} />;
    default:
      return <HiOutlineDatabase {...iconProps} />;
  }
};
